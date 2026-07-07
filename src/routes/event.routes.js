import { Router } from 'express'
import {
    create,
    list,
    getDetail,
    update,
    remove,
    listPublic,
    listFollowedChoirsEvents
} from '../controllers/event.controller.js'
import { uploadEventFiles } from '../config/multer.config.js'
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware.js'
import { requireChoirAdmin, requireChoirMember } from '../middlewares/choirAuth.middleware.js'
import { validateRequest } from '../middlewares/validateRequest.middleware.js'
import {
    createEventValidation,
    updateEventValidation
} from '../validations/event.validation.js'
import { param } from 'express-validator'

const router = Router()

// Listar eventos de coros seguidos (Colocado antes de rutas con parámetros variables para evitar colisión)
router.get('/events/followed', authMiddleware, listFollowedChoirsEvents)

const uploadEventFields = uploadEventFiles.fields([
    { name: 'image', maxCount: 1 },
    { name: 'info', maxCount: 1 }
])

const choirIdValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero')
]

const eventIdValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    param('eventId')
        .isInt()
        .withMessage('El ID del evento debe ser un número entero')
]

// Listar eventos PÚBLICOS de un coro (sin autenticación requerida)
router.get(
    '/choirs/:id/events/public',
    choirIdValidation,
    validateRequest,
    listPublic
)

// Crear evento (solo administradores del coro)
router.post(
    '/choirs/:id/events',
    authMiddleware,
    choirIdValidation,
    validateRequest,
    requireChoirAdmin,
    uploadEventFields,
    createEventValidation,
    validateRequest,
    create
)

// Listar eventos del coro (miembros activos y administradores)
router.get(
    '/choirs/:id/events',
    authMiddleware,
    choirIdValidation,
    validateRequest,
    requireChoirMember,
    list
)

// Detalle de un evento (miembros activos y administradores)
router.get(
    '/choirs/:id/events/:eventId',
    authMiddleware,
    eventIdValidation,
    validateRequest,
    requireChoirMember,
    getDetail
)

// Actualizar evento (solo administradores)
router.put(
    '/choirs/:id/events/:eventId',
    authMiddleware,
    eventIdValidation,
    validateRequest,
    requireChoirAdmin,
    uploadEventFields,
    updateEventValidation,
    validateRequest,
    update
)

// Eliminar evento (solo administradores)
router.delete(
    '/choirs/:id/events/:eventId',
    authMiddleware,
    eventIdValidation,
    validateRequest,
    requireChoirAdmin,
    remove
)

export default router
