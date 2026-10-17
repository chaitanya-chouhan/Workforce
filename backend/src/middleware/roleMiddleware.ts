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

/**
 * Middleware that ensures the authenticated account is ACTIVE (blocks BANNED or SUSPENDED users).
 */
export function requireActiveAccount(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Authentication is required.',
    });
    return;
  }

  if (req.user.accountStatus === 'BANNED' || req.user.accountStatus === 'SUSPENDED') {
    res.status(403).json({
      success: false,
      error: 'Your WorkForce account has been suspended or banned by administration. New actions and assignments are blocked.',
    });
    return;
  }

  next();
}
