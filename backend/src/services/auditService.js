import { query } from '../config/db.js';

/**
 * Audit Logging Service
 * Records immutable audit entries for critical system mutations
 */
export const logAudit = async ({
  societyId,
  actorId = null,
  action,
  entity,
  entityId,
  oldValue = null,
  newValue = null,
  req = null,
}) => {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for'] || req.socket.remoteAddress
      : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    await query(
      `INSERT INTO audit_logs 
        (society_id, actor_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        societyId,
        actorId,
        action,
        entity,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    console.error('[Audit Log Error]: Failed to persist audit record:', err.message);
  }
};
