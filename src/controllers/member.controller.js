import { findChoirById, findUserChoirStatus, followChoir } from '../services/choir.service.js'
import { findUserById } from '../services/auth.service.js'
import { getPublicUrl } from '../services/storage.service.js'
import {
    requestToJoinChoir,
    findPendingRequests,
    updateRequestStatus,
    findChoirMembers,
    updateMemberRole,
    removeChoirMember
} from '../services/member.service.js'

export const join = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const userId = req.user.id

        const choir = await findChoirById(choirId)
        if (!choir) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        const existingMembership = await findUserChoirStatus(choirId, userId)
        if (existingMembership) {
            if (existingMembership.status === 'accepted') {
                return res.status(400).json({ message: 'Ya eres miembro de este coro' })
            } else if (existingMembership.status === 'pending') {
                return res.status(400).json({ message: 'Ya tienes una solicitud de unión pendiente para este coro' })
            }
        }

        await requestToJoinChoir(choirId, userId, choir.is_public)

        if (choir.is_public) {
            try {
                await followChoir(choirId, userId)
            } catch (err) {
                // Ignorar si ya lo seguía
            }
        }

        const message = choir.is_public 
            ? 'Te has unido al coro correctamente' 
            : 'Solicitud para unirse al coro enviada correctamente'

        res.status(201).json({ message })
    } catch (error) {
        next(error)
    }
}

const formatMemberAvatarUrl = (member, req) => {
    if (!member) return null
    const formatted = { ...member }
    const baseUrl = `${req.protocol}://${req.get('host')}`
    formatted.profile_image_url = formatted.user_image
        ? getPublicUrl(formatted.user_image, 'profiles')
        : `${baseUrl}/assets/default-avatar.png`
    return formatted
}

export const listRequests = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const requests = await findPendingRequests(choirId)
        const formatted = requests.map(r => formatMemberAvatarUrl(r, req))
        res.json({ data: formatted })
    } catch (error) {
        next(error)
    }
}

export const respondToRequest = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const userId = req.params.userId
        const { status } = req.body // 'accepted' o 'rejected'

        const membership = await findUserChoirStatus(choirId, userId)
        if (!membership || membership.status !== 'pending') {
            return res.status(404).json({ message: 'No existe una solicitud pendiente para este usuario' })
        }

        if (status === 'accepted') {
            await updateRequestStatus(choirId, userId, 'accepted')
            try {
                await followChoir(choirId, userId)
            } catch (err) {
                // Ignorar si ya lo seguía
            }
            res.json({ message: 'Solicitud aceptada correctamente' })
        } else {
            // Si es rechazada, eliminamos el registro para que pueda volver a solicitar unirse en el futuro si lo desea
            await removeChoirMember(choirId, userId)
            res.json({ message: 'Solicitud rechazada correctamente' })
        }
    } catch (error) {
        next(error)
    }
}

export const listMembers = async (req, res, next) => {
    try {
        const choirId = req.params.id
        
        // 1. Obtener detalles del coro para saber quién es el creador (created_by)
        const choir = await findChoirById(choirId)
        if (!choir) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        // 2. Obtener miembros activos
        const members = await findChoirMembers(choirId)
        
        // 3. Verificar si el creador está en la lista de miembros
        const creatorId = choir.created_by
        const hasCreator = members.some(m => Number(m.user_id) === Number(creatorId))
        
        let finalMembers = [...members]
        
        if (!hasCreator && creatorId) {
            // Si el creador no está en la tabla choir_members (ej. por inconsistencias de pruebas), lo agregamos
            const creatorUser = await findUserById(creatorId)
            if (creatorUser) {
                finalMembers.push({
                    user_id: creatorUser.id,
                    name: creatorUser.name,
                    username: creatorUser.username,
                    email: creatorUser.email,
                    user_image: creatorUser.user_image,
                    role: 'admin',
                    created_at: choir.created_at
                })
            }
        }

        const formatted = finalMembers.map(m => formatMemberAvatarUrl(m, req))
        res.json({ data: formatted })
    } catch (error) {
        next(error)
    }
}

export const updateRole = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const userId = req.params.userId
        const { role } = req.body // 'admin' o 'member'

        const targetMembership = await findUserChoirStatus(choirId, userId)
        if (!targetMembership || targetMembership.status !== 'accepted') {
            return res.status(404).json({ message: 'El usuario no es un miembro activo de este coro' })
        }

        // Si se intenta degradar a un administrador a miembro normal,
        // validar que no sea el único administrador del coro.
        if (targetMembership.role === 'admin' && role === 'member') {
            const members = await findChoirMembers(choirId)
            const adminCount = members.filter(m => m.role === 'admin').length
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'No puedes cambiar el rol del administrador a miembro porque es el único administrador de este coro. Asigna a otro administrador antes de realizar este cambio.'
                })
            }
        }

        await updateMemberRole(choirId, userId, role)

        res.json({
            message: `El rol del usuario ha sido actualizado a ${role} correctamente`
        })
    } catch (error) {
        next(error)
    }
}

export const kickMember = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const userId = req.params.userId
        const loggedInUserId = req.user.id

        const targetMembership = await findUserChoirStatus(choirId, userId)
        if (!targetMembership) {
            return res.status(404).json({ message: 'El usuario no pertenece a este coro' })
        }

        const isSelf = Number(userId) === loggedInUserId

        // Obtener el rol del usuario que realiza la petición
        const requesterMembership = await findUserChoirStatus(choirId, loggedInUserId)
        const isRequesterAdmin = requesterMembership?.role === 'admin'

        if (!isRequesterAdmin && !isSelf) {
            return res.status(403).json({
                message: 'No tienes permisos para expulsar a este usuario del coro'
            })
        }

        // Si se va a salir a sí mismo y es administrador, validar que no sea el único administrador del coro
        if (isSelf && targetMembership.role === 'admin') {
            const members = await findChoirMembers(choirId)
            const adminCount = members.filter(m => m.role === 'admin').length
            if (adminCount <= 1) {
                return res.status(400).json({
                    message: 'No puedes salir del coro porque eres el único administrador. Asigna a otro administrador antes de salir.'
                })
            }
        }

        await removeChoirMember(choirId, userId)

        res.json({
            message: isSelf ? 'Has abandonado el coro correctamente' : 'Miembro expulsado del coro correctamente'
        })
    } catch (error) {
        next(error)
    }
}
