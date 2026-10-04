import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';
import { getSignedFileUrl } from '../config/supabase.js';

export const listTags = async (req, res) => {
  try {
    const tRes = await query('SELECT * FROM complaint_tags WHERE society_id = $1 ORDER BY name', [req.user.societyId]);
    return sendSuccess(res, tRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to list complaint tags.');
  }
};

export const listComplaints = async (req, res) => {
  const societyId = req.user.societyId;
  const { status, tag_id } = req.query;

  try {
    let whereClause = 'WHERE c.society_id = $1';
    const params = [societyId];

    if (req.user.role === 'OWNER') {
      params.push(req.user.flatId);
      whereClause += ` AND c.flat_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND c.status = $${params.length}`;
    }

    if (tag_id) {
      params.push(tag_id);
      whereClause += ` AND c.tag_id = $${params.length}`;
    }

    const sql = `
      SELECT c.*, f.flat_number, u.full_name as member_name, u.mobile as member_mobile,
             t.name as tag_name,
             (SELECT COUNT(*) FROM complaint_messages m WHERE m.complaint_id = c.id) as message_count
      FROM complaints c
      JOIN flats f ON c.flat_id = f.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN complaint_tags t ON c.tag_id = t.id
      ${whereClause}
      ORDER BY 
        CASE WHEN c.status = 'OPEN' THEN 1 WHEN c.status = 'REOPENED' THEN 2 ELSE 3 END,
        c.created_at DESC
    `;

    const cRes = await query(sql, params);
    return sendSuccess(res, cRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to list complaints.');
  }
};

export const createComplaint = async (req, res) => {
  const { title, tag_id, photo_url, message } = req.body;
  const societyId = req.user.societyId;
  const userId = req.user.userId;
  const flatId = req.user.flatId;

  if (!title || (!message && !photo_url)) {
    return sendError(res, 'Title and description or photo are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    // 1. Create complaint record
    const cRes = await query(
      `INSERT INTO complaints (society_id, flat_id, user_id, tag_id, title, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING *`,
      [societyId, flatId, userId, tag_id || null, title.trim()]
    );

    const complaint = cRes.rows[0];

    // 2. Insert initial message
    const msgRes = await query(
      `INSERT INTO complaint_messages (complaint_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [complaint.id, userId, message ? message.trim() : 'Complaint reported with attached photo.']
    );

    // 3. Attach photo if provided
    if (photo_url) {
      await query(
        `INSERT INTO complaint_attachments (complaint_id, message_id, file_url)
         VALUES ($1, $2, $3)`,
        [complaint.id, msgRes.rows[0].id, photo_url]
      );
    }

    // 4. Notify Chairman
    const chairmen = await query(
      `SELECT id FROM users WHERE society_id = $1 AND role = 'CHAIRMAN' AND is_active = TRUE`,
      [societyId]
    );

    for (const c of chairmen.rows) {
      notifyUser({
        societyId,
        userId: c.id,
        title: 'New Complaint Raised',
        body: `Flat ${req.user.flatNumber || 'Member'} reported: "${title}".`,
        eventType: 'COMPLAINT_CREATED',
        entityId: complaint.id,
      });
    }

    await logAudit({
      societyId,
      actorId: userId,
      action: 'COMPLAINT_CREATED',
      entity: 'COMPLAINT',
      entityId: complaint.id,
      newValue: { title, flatId },
      req,
    });

    return sendSuccess(res, complaint, 'Complaint raised successfully.', null, 201);
  } catch (err) {
    console.error('[Create Complaint Error]:', err);
    return sendError(res, 'Failed to create complaint.');
  }
};

export const getComplaintThread = async (req, res) => {
  const { id } = req.params;
  const societyId = req.user.societyId;

  try {
    const cRes = await query(
      `SELECT c.*, f.flat_number, u.full_name as member_name, u.mobile as member_mobile, t.name as tag_name
       FROM complaints c
       JOIN flats f ON c.flat_id = f.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN complaint_tags t ON c.tag_id = t.id
       WHERE c.id = $1 AND c.society_id = $2`,
      [id, societyId]
    );

    if (!cRes.rows.length) return sendError(res, 'Complaint not found.', 'NOT_FOUND', [], 404);

    const complaint = cRes.rows[0];

    // Enforce owner scope
    if (req.user.role === 'OWNER' && complaint.flat_id !== req.user.flatId) {
      return sendError(res, 'Access denied.', 'FORBIDDEN', [], 403);
    }

    // Fetch messages & attachments
    const msgRes = await query(
      `SELECT m.*, u.full_name as sender_name, u.role as sender_role,
              a.file_url as attachment_url
       FROM complaint_messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN complaint_attachments a ON m.id = a.message_id
       WHERE m.complaint_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    const messages = await Promise.all(
      msgRes.rows.map(async (msg) => {
        let signedUrl = null;
        if (msg.attachment_url) {
          signedUrl = await getSignedFileUrl(msg.attachment_url);
        }
        return {
          ...msg,
          signedAttachmentUrl: signedUrl,
        };
      })
    );

    complaint.messages = messages;
    return sendSuccess(res, complaint);
  } catch (err) {
    return sendError(res, 'Failed to fetch complaint thread.');
  }
};

export const addComplaintMessage = async (req, res) => {
  const { id } = req.params;
  const { message, photo_url } = req.body;
  const societyId = req.user.societyId;
  const userId = req.user.userId;

  if (!message && !photo_url) {
    return sendError(res, 'Message text or photo attachment is required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const cRes = await query('SELECT * FROM complaints WHERE id = $1 AND society_id = $2', [id, societyId]);
    if (!cRes.rows.length) return sendError(res, 'Complaint not found.', 'NOT_FOUND', [], 404);

    const complaint = cRes.rows[0];

    // Insert message
    const msgRes = await query(
      `INSERT INTO complaint_messages (complaint_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, userId, message ? message.trim() : 'Attached photo update.']
    );

    const msg = msgRes.rows[0];

    if (photo_url) {
      await query(
        `INSERT INTO complaint_attachments (complaint_id, message_id, file_url)
         VALUES ($1, $2, $3)`,
        [id, msg.id, photo_url]
      );
    }

    // Notify the other party
    if (req.user.role === 'CHAIRMAN') {
      notifyUser({
        societyId,
        userId: complaint.user_id,
        title: 'New Reply on Your Complaint',
        body: `Chairman replied: "${message ? message.substring(0, 80) : 'Photo update'}"`,
        eventType: 'COMPLAINT_REPLY',
        entityId: complaint.id,
      });
    }

    return sendSuccess(res, msg, 'Reply posted successfully.', null, 201);
  } catch (err) {
    return sendError(res, 'Failed to post message.');
  }
};

export const updateComplaintStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'RESOLVED', 'REOPENED'
  const societyId = req.user.societyId;

  if (!['RESOLVED', 'REOPENED'].includes(status)) {
    return sendError(res, "Status must be either 'RESOLVED' or 'REOPENED'.", 'VALIDATION_ERROR', [], 400);
  }

  try {
    const cRes = await query('SELECT * FROM complaints WHERE id = $1 AND society_id = $2', [id, societyId]);
    if (!cRes.rows.length) return sendError(res, 'Complaint not found.', 'NOT_FOUND', [], 404);

    const complaint = cRes.rows[0];
    const resolvedAt = status === 'RESOLVED' ? 'NOW()' : null;

    const updateRes = await query(
      `UPDATE complaints 
       SET status = $1, resolved_at = ${resolvedAt ? 'NOW()' : 'NULL'}, updated_at = NOW()
       WHERE id = $2 AND society_id = $3
       RETURNING *`,
      [status, id, societyId]
    );

    // Notify respective party
    if (status === 'RESOLVED') {
      notifyUser({
        societyId,
        userId: complaint.user_id,
        title: 'Complaint Resolved',
        body: `Your complaint "${complaint.title}" has been marked resolved by the Chairman.`,
        eventType: 'COMPLAINT_RESOLVED',
        entityId: id,
      });
    } else if (status === 'REOPENED') {
      const chairmen = await query(`SELECT id FROM users WHERE society_id = $1 AND role = 'CHAIRMAN'`, [societyId]);
      for (const c of chairmen.rows) {
        notifyUser({
          societyId,
          userId: c.id,
          title: 'Complaint Reopened',
          body: `Member reopened complaint: "${complaint.title}".`,
          eventType: 'COMPLAINT_REOPENED',
          entityId: id,
        });
      }
    }

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: `COMPLAINT_${status}`,
      entity: 'COMPLAINT',
      entityId: id,
      oldValue: { status: complaint.status },
      newValue: { status },
      req,
    });

    return sendSuccess(res, updateRes.rows[0], `Complaint marked as ${status}.`);
  } catch (err) {
    return sendError(res, 'Failed to update complaint status.');
  }
};
