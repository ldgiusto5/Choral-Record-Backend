import { Router } from 'express'
import { create, list, getDetail, update, remove, follow, unfollow, getFollowedChoirs, listFollowers } from '../controllers/choir.controller.js'
import { uploadChoirImage } from '../config/multer.config.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { validateRequest } from '../middlewares/validateRequest.middleware.js'
import { requireChoirAdmin } from '../middlewares/choirAuth.middleware.js'
import { createChoirValidation, choirIdValidation, updateChoirValidation } from '../validations/choir.validation.js'

const router = Router()

// Rutas públicas (con token opcional para verificar estatus del usuario dentro del controlador)
router.get('/choirs', list)
router.get('/choirs/followed/me', authMiddleware, getFollowedChoirs)
router.get('/choirs/:id', choirIdValidation, validateRequest, getDetail)
router.get('/choirs/:id/followers', choirIdValidation, validateRequest, listFollowers)

// Rutas autenticadas
router.post('/choirs', authMiddleware, uploadChoirImage.single('image'), createChoirValidation, validateRequest, create)
router.put('/choirs/:id', authMiddleware, choirIdValidation, validateRequest, requireChoirAdmin, uploadChoirImage.single('image'), updateChoirValidation, validateRequest, update)
router.delete('/choirs/:id', authMiddleware, choirIdValidation, validateRequest, requireChoirAdmin, remove)

// Rutas de seguimiento (Follow)
router.post('/choirs/:id/follow', authMiddleware, choirIdValidation, validateRequest, follow)
router.delete('/choirs/:id/follow', authMiddleware, choirIdValidation, validateRequest, unfollow)

export default router
