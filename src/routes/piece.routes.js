import { Router } from 'express'
import {
    create,
    list,
    getDetail,
    update,
    remove,
    swap,
    reorder
} from '../controllers/piece.controller.js'
import { uploadPieceFiles } from '../config/multer.config.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireChoirAdmin, requireChoirMember } from '../middlewares/choirAuth.middleware.js'
import { validateRequest } from '../middlewares/validateRequest.middleware.js'
import {
    createPieceValidation,
    updatePieceValidation,
    pieceIdValidation,
    swapPieceValidation,
    reorderPieceValidation
} from '../validations/piece.validation.js'

const router = Router()

const uploadPieceFields = uploadPieceFiles.fields([
    { name: 'partitura', maxCount: 1 },
    { name: 'vozCoral', maxCount: 1 },
    { name: 'vozSoprano', maxCount: 1 },
    { name: 'vozSoprano2', maxCount: 1 },
    { name: 'vozContralto', maxCount: 1 },
    { name: 'vozContralto2', maxCount: 1 },
    { name: 'vozTenor', maxCount: 1 },
    { name: 'vozTenor2', maxCount: 1 },
    { name: 'vozBajo', maxCount: 1 },
    { name: 'vozBajo2', maxCount: 1 },
    { name: 'baseInstrumental', maxCount: 1 },
    { name: 'infoAdicional', maxCount: 1 }
])

// Crear pieza (solo administradores del coro)
router.post(
    '/choirs/:id/pieces',
    authMiddleware,
    requireChoirAdmin,
    uploadPieceFields,
    createPieceValidation,
    validateRequest,
    create
)

// Listar piezas del coro (miembros activos y administradores)
router.get(
    '/choirs/:id/pieces',
    authMiddleware,
    requireChoirMember,
    list
)

// Detalle de una pieza (miembros activos y administradores)
router.get(
    '/choirs/:id/pieces/:pieceId',
    authMiddleware,
    pieceIdValidation,
    validateRequest,
    requireChoirMember,
    getDetail
)

// Actualizar pieza (solo administradores)
router.put(
    '/choirs/:id/pieces/:pieceId',
    authMiddleware,
    requireChoirAdmin,
    uploadPieceFields,
    updatePieceValidation,
    validateRequest,
    update
)

// Eliminar pieza (solo administradores)
router.delete(
    '/choirs/:id/pieces/:pieceId',
    authMiddleware,
    pieceIdValidation,
    validateRequest,
    requireChoirAdmin,
    remove
)

// Intercambiar orden de dos piezas (solo administradores)
router.patch(
    '/choirs/:id/pieces/:pieceId/swap',
    authMiddleware,
    swapPieceValidation,
    validateRequest,
    requireChoirAdmin,
    swap
)

// Reordenar una pieza a una posición específica (solo administradores)
router.patch(
    '/choirs/:id/pieces/:pieceId/reorder',
    authMiddleware,
    reorderPieceValidation,
    validateRequest,
    requireChoirAdmin,
    reorder
)

export default router
