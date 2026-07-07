import { Router } from 'express'
import { login, profile, register, editProfile, deleteProfileImage, deleteMe, adminDeleteUser, getMyProfile, listUsers, verifyEmail, refresh, logoutAll, logout } from '../controllers/auth.controller.js'
import { getUserChoirs, getExternalUserChoirs, getFollowedChoirs, getExternalUserFollowedChoirs } from '../controllers/choir.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireAdmin } from '../middlewares/role.middleware.js'
import { validateRequest } from '../middlewares/validateRequest.middleware.js'
import { uploadProfileImage } from '../config/multer.config.js'
import {
    loginValidation,
    registerValidation
} from '../validations/auth.validation.js'

const router = Router()

router.post('/auth/register', registerValidation, validateRequest, register)
router.post('/auth/login', loginValidation, validateRequest, login)
router.get('/auth/verify-email', verifyEmail)
router.post('/auth/refresh', refresh)
router.post('/auth/logout-all', authMiddleware, logoutAll)
router.post('/auth/logout', logout)

// Rutas de búsqueda y perfiles
router.get('/auth/users', listUsers)
router.get('/auth/profile/me/choirs', authMiddleware, getUserChoirs)
router.get('/auth/profile/me/followed-choirs', authMiddleware, getFollowedChoirs)
router.get('/auth/profile/me', authMiddleware, getMyProfile)
router.get('/auth/profile/:username/choirs', authMiddleware, getExternalUserChoirs)
router.get('/auth/profile/:username/followed-choirs', authMiddleware, getExternalUserFollowedChoirs)
router.get('/auth/profile/:username', authMiddleware, profile)
router.put('/auth/profile/:username', authMiddleware, uploadProfileImage.single('user_image'), editProfile)
router.delete('/auth/profile/:username/image', authMiddleware, deleteProfileImage)

// Rutas de eliminación de usuario
router.delete('/auth/me', authMiddleware, deleteMe)
router.delete('/admin/users/:id', authMiddleware, requireAdmin, adminDeleteUser)

export default router