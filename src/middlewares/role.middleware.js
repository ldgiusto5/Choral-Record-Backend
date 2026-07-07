// src/middlewares/role.middleware.js
import { AppError } from '../errors/AppError.js';

/**
 * Middleware to ensure the authenticated user has admin role.
 * If not, responds with 403 Forbidden.
 */
export const requireAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso restringido: se requiere rol de administrador' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error interno de autorización' });
  }
};
