import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';

export const getSocietyDetails = async (req, res) => {
  try {
    const sRes = await query('SELECT * FROM societies WHERE id = $1', [req.user.societyId]);
    if (!sRes.rows.length) {
      return sendError(res, 'Society not found.', 'NOT_FOUND', [], 404);
    }
    return sendSuccess(res, sRes.rows[0]);
  } catch (err) {
    return sendError(res, 'Failed to fetch society details.');
  }
};

export const updateSocietySettings = async (req, res) => {
  const { name, address, upi_id, upi_qr_image_url, late_fee_type, late_fee_value, grace_period_days } = req.body;
  const societyId = req.user.societyId;

  try {
    const existing = await query('SELECT * FROM societies WHERE id = $1', [societyId]);
    const prev = existing.rows[0];

    const updateRes = await query(
      `UPDATE societies 
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           upi_id = COALESCE($3, upi_id),
           upi_qr_image_url = COALESCE($4, upi_qr_image_url),
           late_fee_type = COALESCE($5, late_fee_type),
           late_fee_value = COALESCE($6, late_fee_value),
           grace_period_days = COALESCE($7, grace_period_days),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, address, upi_id, upi_qr_image_url, late_fee_type, late_fee_value, grace_period_days, societyId]
    );

    await logAudit({
      societyId,
      actorId: req.user.userId,
      action: 'SOCIETY_SETTINGS_UPDATED',
      entity: 'SOCIETY',
      entityId: societyId,
      oldValue: prev,
      newValue: updateRes.rows[0],
      req,
    });

    return sendSuccess(res, updateRes.rows[0], 'Society settings updated successfully.');
  } catch (err) {
    return sendError(res, 'Failed to update society settings.');
  }
};

export const getStructure = async (req, res) => {
  const societyId = req.user.societyId;

  try {
    const buildings = await query('SELECT * FROM buildings WHERE society_id = $1 AND deleted_at IS NULL ORDER BY name', [societyId]);
    const wings = await query('SELECT * FROM wings WHERE society_id = $1 AND deleted_at IS NULL ORDER BY name', [societyId]);
    const flats = await query(
      `SELECT f.*, u.id as owner_id, u.full_name as owner_name, u.mobile as owner_mobile, u.invite_code, u.is_active as owner_active
       FROM flats f
       LEFT JOIN users u ON f.id = u.flat_id AND u.role = 'OWNER'
       WHERE f.society_id = $1 AND f.deleted_at IS NULL
       ORDER BY f.flat_number`,
      [societyId]
    );

    return sendSuccess(res, {
      buildings: buildings.rows,
      wings: wings.rows,
      flats: flats.rows,
    });
  } catch (err) {
    return sendError(res, 'Failed to fetch society hierarchy structure.');
  }
};

export const createBuilding = async (req, res) => {
  const { name } = req.body;
  if (!name) return sendError(res, 'Building name is required.', 'VALIDATION_ERROR', [], 400);

  try {
    const resB = await query(
      'INSERT INTO buildings (society_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.societyId, name.trim()]
    );
    return sendSuccess(res, resB.rows[0], 'Building created.');
  } catch (err) {
    return sendError(res, 'Failed to create building.');
  }
};

export const createWing = async (req, res) => {
  const { building_id, name } = req.body;
  if (!building_id || !name) return sendError(res, 'Building ID and Wing name are required.', 'VALIDATION_ERROR', [], 400);

  try {
    const resW = await query(
      'INSERT INTO wings (society_id, building_id, name) VALUES ($1, $2, $3) RETURNING *',
      [req.user.societyId, building_id, name.trim()]
    );
    return sendSuccess(res, resW.rows[0], 'Wing created.');
  } catch (err) {
    return sendError(res, 'Failed to create wing.');
  }
};

export const createFlat = async (req, res) => {
  const { flat_number, carpet_area_sqft, wing_id, floor_id, occupancy_status, tenant_note } = req.body;
  if (!flat_number) return sendError(res, 'Flat number is required.', 'VALIDATION_ERROR', [], 400);

  try {
    const resF = await query(
      `INSERT INTO flats (society_id, flat_number, carpet_area_sqft, wing_id, floor_id, occupancy_status, tenant_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.societyId, flat_number.trim(), carpet_area_sqft || null, wing_id || null, floor_id || null, occupancy_status || 'OCCUPIED', tenant_note || null]
    );

    await logAudit({
      societyId: req.user.societyId,
      actorId: req.user.userId,
      action: 'FLAT_CREATED',
      entity: 'FLAT',
      entityId: resF.rows[0].id,
      newValue: resF.rows[0],
      req,
    });

    return sendSuccess(res, resF.rows[0], 'Flat created successfully.', null, 201);
  } catch (err) {
    if (err.code === '23505') {
      return sendError(res, `Flat number '${flat_number}' already exists in this society.`, 'DUPLICATE_FLAT', [], 409);
    }
    return sendError(res, 'Failed to create flat.');
  }
};

export const updateFlat = async (req, res) => {
  const { id } = req.params;
  const { flat_number, carpet_area_sqft, occupancy_status, tenant_note } = req.body;

  try {
    const resF = await query(
      `UPDATE flats
       SET flat_number = COALESCE($1, flat_number),
           carpet_area_sqft = COALESCE($2, carpet_area_sqft),
           occupancy_status = COALESCE($3, occupancy_status),
           tenant_note = COALESCE($4, tenant_note),
           updated_at = NOW()
       WHERE id = $5 AND society_id = $6
       RETURNING *`,
      [flat_number, carpet_area_sqft, occupancy_status, tenant_note, id, req.user.societyId]
    );

    if (!resF.rows.length) return sendError(res, 'Flat not found.', 'NOT_FOUND', [], 404);
    return sendSuccess(res, resF.rows[0], 'Flat details updated.');
  } catch (err) {
    return sendError(res, 'Failed to update flat.');
  }
};
