import { Router } from 'express'
import {
    join,
    listRequests,
    respondToRequest,
    listMembers,
    updateRole,
    kickMember
} from '../controllers/member.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireChoirAdmin, requireChoirMember } from '../middlewares/choirAuth.middleware.js'
import { validateRequest } from '../middlewares/validateRequest.middleware.js'
import {
    choirIdValidation,
    updateMemberStatusValidation,
    updateMemberRoleValidation
} from '../validations/choir.validation.js'
import { resolveChoirIdParam } from '../middlewares/resolveChoirId.middleware.js'

const router = Router()

router.param('id', resolveChoirIdParam)

// Solicitar unirse a un coro
router.post(
    '/choirs/:id/join',
    authMiddleware,
    choirIdValidation,
    validateRequest,
    join
)

// Ver solicitudes pendientes (solo creador/administradores del coro)
router.get(
    '/choirs/:id/requests',
    authMiddleware,
    choirIdValidation,
    validateRequest,
    requireChoirAdmin,
    listRequests
)

// Aceptar/Rechazar solicitud (solo creador/administradores del coro)
router.put(
    '/choirs/:id/requests/:userId',
    authMiddleware,
    updateMemberStatusValidation,
    validateRequest,
    requireChoirAdmin,
    respondToRequest
)

// Listar miembros del coro (público)
router.get(
    '/choirs/:id/members',
    choirIdValidation,
    validateRequest,
    listMembers
)

// Cambiar rol de miembro a admin o viceversa (solo administradores)
router.put(
    '/choirs/:id/members/:userId/role',
    authMiddleware,
    updateMemberRoleValidation,
    validateRequest,
    requireChoirAdmin,
    updateRole
)

// Expulsar miembro o salirse del coro (el controlador gestiona permisos si es self o admin)
router.delete(
    '/choirs/:id/members/:userId',
    authMiddleware,
    kickMember
)

export default router
