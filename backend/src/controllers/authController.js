import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'antigravity_society_access_secret_2026_secure_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'antigravity_society_refresh_secret_2026_secure_key';

const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    societyId: user.society_id,
    role: user.role,
    flatId: user.flat_id || null,
    fullName: user.full_name,
    mobile: user.mobile,
  };

  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};

/**
 * Chairman Login (Email or Mobile + Password)
 */
export const loginChairman = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return sendError(res, 'Identifier (email/mobile) and password are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const userRes = await query(
      `SELECT u.*, s.name as society_name 
       FROM users u
       JOIN societies s ON u.society_id = s.id
       WHERE (u.email = $1 OR u.mobile = $1) AND u.role = 'CHAIRMAN' AND u.is_active = TRUE`,
      [identifier.trim()]
    );

    if (!userRes.rows.length) {
      return sendError(res, 'Invalid credentials or user not registered as Chairman.', 'INVALID_CREDENTIALS', [], 401);
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash || '');
    if (!passwordMatch) {
      return sendError(res, 'Invalid credentials.', 'INVALID_CREDENTIALS', [], 401);
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    // Set httpOnly cookie for web admin portal
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAudit({
      societyId: user.society_id,
      actorId: user.id,
      action: 'CHAIRMAN_LOGIN',
      entity: 'USER',
      entityId: user.id,
      req,
    });

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        societyId: user.society_id,
        societyName: user.society_name,
      },
    }, 'Chairman login successful.');
  } catch (err) {
    console.error('[Login Chairman Error]:', err);
    return sendError(res, 'An error occurred during login.');
  }
};

/**
 * Owner Invite Code Verification (Mobile App Onboarding Step 1)
 */
export const verifyInvite = async (req, res) => {
  const { mobile, inviteCode } = req.body;

  if (!mobile || !inviteCode) {
    return sendError(res, 'Mobile number and 6-digit invite code are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const userRes = await query(
      `SELECT u.*, f.flat_number, s.name as society_name
       FROM users u
       JOIN societies s ON u.society_id = s.id
       LEFT JOIN flats f ON u.flat_id = f.id
       WHERE u.mobile = $1 AND u.invite_code = $2 AND u.is_active = TRUE`,
      [mobile.trim(), inviteCode.trim()]
    );

    if (!userRes.rows.length) {
      return sendError(res, 'Invalid invite code or mobile number.', 'INVALID_INVITE_CODE', [], 400);
    }

    const user = userRes.rows[0];

    // Check expiry
    if (user.invite_code_expires_at && new Date() > new Date(user.invite_code_expires_at)) {
      return sendError(res, 'Invite code has expired. Please ask your Chairman to regenerate it.', 'INVITE_CODE_EXPIRED', [], 400);
    }

    // Generate short-lived registration ticket
    const ticket = jwt.sign(
      { userId: user.id, societyId: user.society_id, purpose: 'SET_PIN' },
      JWT_ACCESS_SECRET,
      { expiresIn: '30m' }
    );

    return sendSuccess(res, {
      ticket,
      member: {
        fullName: user.full_name,
        mobile: user.mobile,
        flatNumber: user.flat_number,
        societyName: user.society_name,
      },
    }, 'Invite code verified. Please set your 4-digit PIN.');
  } catch (err) {
    console.error('[Verify Invite Error]:', err);
    return sendError(res, 'Failed to verify invite code.');
  }
};

/**
 * Set 4-Digit PIN (Mobile App Onboarding Step 2)
 */
export const setPin = async (req, res) => {
  const { ticket, pin } = req.body;

  if (!ticket || !pin || !/^\d{4}$/.test(pin.toString())) {
    return sendError(res, 'A valid registration ticket and 4-digit numeric PIN are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const decoded = jwt.verify(ticket, JWT_ACCESS_SECRET);
    if (decoded.purpose !== 'SET_PIN') {
      return sendError(res, 'Invalid registration ticket.', 'INVALID_TICKET', [], 400);
    }

    const pinHash = await bcrypt.hash(pin.toString(), 10);

    // Update user: set pin_hash, clear invite_code
    const updateRes = await query(
      `UPDATE users 
       SET pin_hash = $1, invite_code = NULL, invite_code_expires_at = NULL, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [pinHash, decoded.userId]
    );

    const user = updateRes.rows[0];
    const { accessToken, refreshToken } = generateTokens(user);

    await logAudit({
      societyId: user.society_id,
      actorId: user.id,
      action: 'OWNER_PIN_INITIALIZED',
      entity: 'USER',
      entityId: user.id,
      req,
    });

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        mobile: user.mobile,
        flatId: user.flat_id,
        societyId: user.society_id,
      },
    }, 'PIN set successfully. Welcome to your society app!');
  } catch (err) {
    console.error('[Set PIN Error]:', err);
    return sendError(res, 'Failed to set PIN. The onboarding session may have expired.');
  }
};

/**
 * Owner Login (Mobile + 4-Digit PIN)
 */
export const loginOwner = async (req, res) => {
  const { mobile, pin, expoPushToken } = req.body;

  if (!mobile || !pin) {
    return sendError(res, 'Mobile number and 4-digit PIN are required.', 'VALIDATION_ERROR', [], 400);
  }

  try {
    const userRes = await query(
      `SELECT u.*, f.flat_number, s.name as society_name
       FROM users u
       JOIN societies s ON u.society_id = s.id
       LEFT JOIN flats f ON u.flat_id = f.id
       WHERE u.mobile = $1 AND u.role = 'OWNER' AND u.is_active = TRUE`,
      [mobile.trim()]
    );

    if (!userRes.rows.length) {
      return sendError(res, 'Account not found. Please contact your Chairman for an invite code.', 'USER_NOT_FOUND', [], 404);
    }

    const user = userRes.rows[0];

    if (!user.pin_hash) {
      return sendError(res, 'Your PIN has not been initialized. Please use your 6-digit invite code first.', 'PIN_NOT_SET', [], 400);
    }

    const pinMatch = await bcrypt.compare(pin.toString(), user.pin_hash);
    if (!pinMatch) {
      return sendError(res, 'Incorrect 4-digit PIN.', 'INVALID_PIN', [], 401);
    }

    // Update push token if provided
    if (expoPushToken && expoPushToken !== user.expo_push_token) {
      await query('UPDATE users SET expo_push_token = $1 WHERE id = $2', [expoPushToken, user.id]);
    }

    const { accessToken, refreshToken } = generateTokens(user);

    await logAudit({
      societyId: user.society_id,
      actorId: user.id,
      action: 'OWNER_LOGIN',
      entity: 'USER',
      entityId: user.id,
      req,
    });

    return sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        mobile: user.mobile,
        flatId: user.flat_id,
        flatNumber: user.flat_number,
        societyId: user.society_id,
        societyName: user.society_name,
      },
    }, 'Owner login successful.');
  } catch (err) {
    console.error('[Login Owner Error]:', err);
    return sendError(res, 'An error occurred during owner login.');
  }
};

/**
 * Refresh Access Token
 */
export const refreshToken = async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;

  if (!token) {
    return sendError(res, 'Refresh token required.', 'TOKEN_MISSING', [], 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    const userRes = await query('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [decoded.userId]);

    if (!userRes.rows.length) {
      return sendError(res, 'User inactive or not found.', 'USER_INACTIVE', [], 403);
    }

    const user = userRes.rows[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    return sendSuccess(res, {
      accessToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed successfully.');
  } catch (err) {
    return sendError(res, 'Invalid or expired refresh token.', 'INVALID_REFRESH_TOKEN', [], 403);
  }
};

/**
 * Get Current User Profile
 */
export const getMe = async (req, res) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.role, u.full_name, u.mobile, u.email, u.flat_id, u.society_id,
              f.flat_number, s.name as society_name, s.upi_id, s.upi_qr_image_url
       FROM users u
       JOIN societies s ON u.society_id = s.id
       LEFT JOIN flats f ON u.flat_id = f.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (!userRes.rows.length) {
      return sendError(res, 'User not found.', 'USER_NOT_FOUND', [], 404);
    }

    return sendSuccess(res, userRes.rows[0], 'User profile retrieved.');
  } catch (err) {
    return sendError(res, 'Failed to fetch user profile.');
  }
};
