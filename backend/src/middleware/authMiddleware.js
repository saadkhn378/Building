import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'antigravity_society_access_secret_2026_secure_key';

/**
 * Verifies JWT Access Token from Authorization Header
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 'Authentication token required.', 'UNAUTHORIZED', [], 401);
  }

  jwt.verify(token, JWT_ACCESS_SECRET, (err, decodedUser) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired. Please refresh your session.', 'TOKEN_EXPIRED', [], 401);
      }
      return sendError(res, 'Invalid authentication token.', 'INVALID_TOKEN', [], 403);
    }

    req.user = decodedUser;
    next();
  });
};

/**
 * Enforces Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles 
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 'UNAUTHORIZED', [], 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
        'FORBIDDEN',
        [],
        403
      );
    }

    next();
  };
};

/**
 * Enforces that an OWNER member only accesses their own flat's resources
 */
export const enforceOwnerFlatScope = (req, res, next) => {
  if (req.user && req.user.role === 'OWNER') {
    // If request supplies flat_id, ensure it matches owner's flat_id
    const targetFlatId = req.params.flatId || req.body.flat_id || req.query.flat_id;
    if (targetFlatId && targetFlatId !== req.user.flat_id) {
      return sendError(
        res,
        'Access denied. You can only view or manage resources for your registered flat.',
        'FORBIDDEN_FLAT_ACCESS',
        [],
        403
      );
    }
  }
  next();
};
