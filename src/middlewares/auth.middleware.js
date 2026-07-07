import jwt from 'jsonwebtoken'
import { AppError } from '../errors/AppError.js'

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({
	      message: "Token no proporcionado",
		    });
    }

    const [type, token] = authHeader.split(' ')

    if (type !== 'Bearer' || !token) {
        return res.status(401).json({
	      message: "Formato de token no válido",
		    });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decoded

        next()
    } catch (error) {
        return res.status(401).json({
	      message: "Token no válido o expirado",
		    });
    }
}

/**
 * Middleware opcional de autenticación: si hay token lo decodifica y adjunta req.user,
 * pero si no hay token o no es válido, simplemente sigue sin bloquear la petición.
 * Utilizado para rutas públicas que ofrecen más información a usuarios autenticados.
 */
export const optionalAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) return next()

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return next()

    try {
        const decoded = jwt.verify(parts[1], process.env.JWT_SECRET)
        req.user = decoded
    } catch (_) {
        // Token inválido o expirado — ignorar y continuar sin usuario
    }
    next()
}