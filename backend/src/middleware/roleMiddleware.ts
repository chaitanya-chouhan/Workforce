import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

/**
 * Middleware that restricts route access to specific roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized. Authentication is required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden. This operation requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}
