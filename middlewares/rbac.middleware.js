import { AppError } from '../utils/appError.js';
import { hasPermission } from '../config/permissions.js';

/**
 * Middleware that checks if the current user's role has permission
 * to perform the specified action defined in config/permissions.js.
 */
export const checkPermission = (action) => {
  return (req, res, next) => {
    // Edge case if user is somehow not populated
    if (!req.user || !req.user.role) {
      return next(new AppError('Authentication state lost', 401));
    }

    if (!hasPermission(req.user.role, action)) {
      return next(
        new AppError(`You do not have permission to perform this action (${action})`, 403)
      );
    }
    next();
  };
};
