import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';
import { broadcastToSociety } from '../services/notificationService.js';

export const listAnnouncements = async (req, res) => {
  const societyId = req.user.societyId;
  try {
    const aRes = await query(
      `SELECT a.*, u.full_name as author_name
       FROM announcements a
       JOIN users u ON a.created_by = u.id
       WHERE a.society_id = $1 AND (a.expires_at IS NULL OR a.expires_at > NOW())
       ORDER BY 
         CASE WHEN a.priority = 'EMERGENCY' THEN 1 WHEN a.priority = 'IMPORTANT' THEN 2 ELSE 3 END,
         a.created_at DESC`,
      [societyId]
    );
    return sendSuccess(res, aRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to list announcements.');
  }
};

export const createAnnouncement = async (req, res) => {
  const { title, content, priority, image_url, expires_at } = req.body;
  const societyId = req.user.societyId;
  const userId = req.user.userId;

  if (!title || !content) {
    return sendError(res, 'Title and content are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const cleanPriority = ['NORMAL', 'IMPORTANT', 'EMERGENCY'].includes(priority) ? priority : 'NORMAL';

    const aRes = await query(
      `INSERT INTO announcements (society_id, title, content, priority, image_url, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [societyId, title.trim(), content.trim(), cleanPriority, image_url || null, expires_at || null, userId]
    );

    const announcement = aRes.rows[0];

    // Broadcast push notification to all society members
    broadcastToSociety({
      societyId,
      title: `${cleanPriority === 'EMERGENCY' ? '🚨 EMERGENCY NOTICE: ' : ''}${title}`,
      body: content.length > 100 ? content.substring(0, 97) + '...' : content,
      eventType: 'ANNOUNCEMENT',
      entityId: announcement.id,
    });

    await logAudit({
      societyId,
      actorId: userId,
      action: 'ANNOUNCEMENT_CREATED',
      entity: 'ANNOUNCEMENT',
      entityId: announcement.id,
      newValue: { title, priority: cleanPriority },
      req,
    });

    return sendSuccess(res, announcement, 'Announcement published and broadcast to members.', null, 201);
  } catch (err) {
    return sendError(res, 'Failed to create announcement.');
  }
};
