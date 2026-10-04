import { query } from '../config/db.js';

/**
 * Dispatch Push Notification via Expo Push Notifications (Free Tier)
 * @param {string} pushToken 
 * @param {string} title 
 * @param {string} body 
 * @param {object} data 
 */
export const sendExpoPush = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
    return;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.warn('[Expo Push Error]:', err.message);
  }
};

/**
 * Creates in-app notification and dispatches push notification if available
 */
export const notifyUser = async ({
  societyId,
  userId,
  title,
  body,
  eventType,
  entityId = null,
  data = {},
}) => {
  try {
    // 1. Store in DB
    const res = await query(
      `INSERT INTO notifications (society_id, user_id, title, body, event_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [societyId, userId, title, body, eventType, entityId]
    );

    // 2. Fetch user's push token
    const userRes = await query('SELECT expo_push_token FROM users WHERE id = $1', [userId]);
    const pushToken = userRes.rows[0]?.expo_push_token;

    if (pushToken) {
      await sendExpoPush(pushToken, title, body, { ...data, eventType, entityId });
    }

    return res.rows[0];
  } catch (err) {
    console.error('[Notification Error]:', err.message);
  }
};

/**
 * Broadcasts notification to all active owners in the society
 */
export const broadcastToSociety = async ({
  societyId,
  title,
  body,
  eventType = 'ANNOUNCEMENT',
  entityId = null,
  data = {},
}) => {
  try {
    const usersRes = await query(
      `SELECT id, expo_push_token FROM users WHERE society_id = $1 AND role = 'OWNER' AND is_active = TRUE`,
      [societyId]
    );

    for (const u of usersRes.rows) {
      await notifyUser({
        societyId,
        userId: u.id,
        title,
        body,
        eventType,
        entityId,
        data,
      });
    }
  } catch (err) {
    console.error('[Broadcast Notification Error]:', err.message);
  }
};
