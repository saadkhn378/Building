import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { generate6DigitCode, getExpiryDays } from '../utils/otp.js';
import { logAudit } from '../services/auditService.js';

export const listOwners = async (req, res) => {
  const societyId = req.user.societyId;
  try {
    const resO = await query(
      `SELECT u.id, u.full_name, u.mobile, u.email, u.role, u.is_active, 
              u.invite_code, u.invite_code_expires_at, u.pin_hash IS NOT NULL as has_pin,
              u.created_at, f.id as flat_id, f.flat_number, f.occupancy_status
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       WHERE u.society_id = $1 AND u.role = 'OWNER' AND u.deleted_at IS NULL
       ORDER BY f.flat_number ASC NULLS LAST, u.full_name ASC`,
      [societyId]
    );
    return sendSuccess(res, resO.rows);
  } catch (err) {
    return sendError(res, 'Failed to list owners.');
  }
};

export const createOwner = async (req, res) => {
  const { full_name, mobile, email, flat_id } = req.body;
  const societyId = req.user.societyId;

  if (!full_name || !mobile || !flat_id) {
    return sendError(res, 'Full name, mobile number, and flat assignment are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    // Check if flat already has an active owner
    const existingActiveOwner = await query(
      `SELECT id, full_name FROM users WHERE flat_id = $1 AND is_active = TRUE AND role = 'OWNER'`,
      [flat_id]
    );
    if (existingActiveOwner.rows.length) {
      return sendError(
        res,
        `This flat is currently assigned to active owner '${existingActiveOwner.rows[0].full_name}'. Deactivate the existing owner first if this is a flat transfer.`,
        'FLAT_ALREADY_ASSIGNED',
        [],
        400
      );
    }

    const inviteCode = generate6DigitCode();
    const expiresAt = getExpiryDays(7);

    const insertRes = await query(
      `INSERT INTO users (society_id, flat_id, full_name, mobile, email, role, invite_code, invite_code_expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, 'OWNER', $6, $7, TRUE)
       RETURNING id, full_name, mobile, email, flat_id, invite_code, invite_code_expires_at`,
      [societyId, flat_id, full_name.trim(), mobile.trim(), email ? email.trim() : null, inviteCode, expiresAt]
    );

    const newOwner = insertRes.rows[0];

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: 'OWNER_REGISTERED',
      entity: 'USER',
      entityId: newOwner.id,
      newValue: { fullName: newOwner.full_name, mobile: newOwner.mobile, flatId: newOwner.flat_id },
      req,
    });

    return sendSuccess(res, newOwner, 'Owner registered successfully. 6-digit invite code generated.', null, 201);
  } catch (err) {
    if (err.code === '23505') {
      return sendError(res, 'A user with this mobile number already exists in the society.', 'DUPLICATE_MOBILE', [], 409);
    }
    return sendError(res, 'Failed to register owner.');
  }
};

export const regenerateInviteCode = async (req, res) => {
  const { id } = req.params;
  const societyId = req.user.societyId;

  try {
    const inviteCode = generate6DigitCode();
    const expiresAt = getExpiryDays(7);

    const updateRes = await query(
      `UPDATE users 
       SET invite_code = $1, invite_code_expires_at = $2, pin_hash = NULL, updated_at = NOW()
       WHERE id = $3 AND society_id = $4 AND role = 'OWNER'
       RETURNING id, full_name, mobile, invite_code, invite_code_expires_at`,
      [inviteCode, expiresAt, id, societyId]
    );

    if (!updateRes.rows.length) {
      return sendError(res, 'Owner not found.', 'NOT_FOUND', [], 404);
    }

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: 'INVITE_CODE_REGENERATED',
      entity: 'USER',
      entityId: id,
      newValue: { inviteCodeExpiresAt: expiresAt },
      req,
    });

    return sendSuccess(res, updateRes.rows[0], 'Invite code regenerated. Share this code with the flat owner.');
  } catch (err) {
    return sendError(res, 'Failed to regenerate invite code.');
  }
};

export const deactivateOwner = async (req, res) => {
  const { id } = req.params;
  const societyId = req.user.societyId;

  try {
    const updateRes = await query(
      `UPDATE users 
       SET is_active = FALSE, invite_code = NULL, flat_id = NULL, updated_at = NOW()
       WHERE id = $1 AND society_id = $2
       RETURNING id, full_name, is_active`,
      [id, societyId]
    );

    if (!updateRes.rows.length) {
      return sendError(res, 'Owner not found.', 'NOT_FOUND', [], 404);
    }

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: 'OWNER_DEACTIVATED',
      entity: 'USER',
      entityId: id,
      req,
    });

    return sendSuccess(res, updateRes.rows[0], 'Owner account deactivated. History preserved with flat.');
  } catch (err) {
    return sendError(res, 'Failed to deactivate owner.');
  }
};

// Family members for Owner App
export const listFamilyMembers = async (req, res) => {
  try {
    const fRes = await query(
      'SELECT * FROM family_members WHERE user_id = $1 ORDER BY created_at',
      [req.user.userId]
    );
    return sendSuccess(res, fRes.rows);
  } catch (err) {
    return sendError(res, 'Failed to fetch family members.');
  }
};

export const addFamilyMember = async (req, res) => {
  const { name, relation } = req.body;
  if (!name || !relation) {
    return sendError(res, 'Name and relation are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const resF = await query(
      'INSERT INTO family_members (user_id, name, relation) VALUES ($1, $2, $3) RETURNING *',
      [req.user.userId, name.trim(), relation.trim()]
    );
    return sendSuccess(res, resF.rows[0], 'Family member added.', null, 201);
  } catch (err) {
    return sendError(res, 'Failed to add family member.');
  }
};
