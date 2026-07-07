import { createChoir, findAllChoirs, findChoirById, findUserChoirStatus, updateChoir, deleteChoir, findChoirsByUser, followChoir, unfollowChoir, getFollowStatus, getFollowersCount, findFollowedChoirsByUser, getChoirFollowers } from '../services/choir.service.js'
import { findUserByUsername, findUserById } from '../services/auth.service.js'
import jwt from 'jsonwebtoken'
import { uploadFile, deleteFile, getPublicUrl } from '../services/storage.service.js'

// Helper para dar formato a la URL de la imagen del coro
const formatChoirImageUrl = (choir, req) => {
    if (!choir) return null
    const formatted = { ...choir }
    if (formatted.image_file) {
        formatted.image_file = getPublicUrl(formatted.image_file, 'choirs')
    }
    return formatted
}

// Helper para decodificar token opcionalmente y obtener el ID del usuario
const getUserIdFromHeader = (req) => {
    try {
        const authHeader = req.headers.authorization
        if (authHeader) {
            const [type, token] = authHeader.split(' ')
            if (type === 'Bearer' && token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                return decoded.id
            }
        }
    } catch (error) {
        console.error("Error al decodificar el token")
    }
    return null
}

const parseBoolean = (value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'boolean') return value
    const normalized = String(value).toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export const create = async (req, res, next) => {
    try {
        const { name, description, is_public, place, country } = req.body
        const createdBy = req.user.id
        const isPublic = parseBoolean(is_public)

        let imageFile = null
        if (req.file) {
            imageFile = await uploadFile(req.file, 'choirs')
        }

        const user = await findUserById(createdBy)
        const creatorName = user ? user.name : ''

        const choir = await createChoir({ 
            name, 
            description, 
            image_file: imageFile, 
            is_public: isPublic, 
            place: place || null, 
            country: country || null, 
            createdBy,
            creator_name: creatorName
        })

        res.status(201).json({
            message: 'Coro creado correctamente',
            choir: formatChoirImageUrl(choir, req)
        })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                message: 'Ya existe un coro con ese nombre'
            })
        }
        next(error)
    }
}

export const list = async (req, res, next) => {
    try {
        const choirs = await findAllChoirs()
        const userId = getUserIdFromHeader(req)

        const data = await Promise.all(choirs.map(async (choir) => {
            let membership = null
            let is_following = false
            if (userId) {
                membership = await findUserChoirStatus(choir.id, userId)
                is_following = await getFollowStatus(choir.id, userId)
            }
            const followers_count = await getFollowersCount(choir.id)
            return formatChoirImageUrl({
                ...choir,
                membership,
                is_following,
                followers_count
            }, req)
        }))

        res.json({ data })
    } catch (error) {
        next(error)
    }
}

export const getDetail = async (req, res, next) => {
    try {
        const choir = await findChoirById(req.params.id)

        if (!choir) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        const userId = getUserIdFromHeader(req)
        let membership = null
        let is_following = false
        if (userId) {
            membership = await findUserChoirStatus(choir.id, userId)
            is_following = await getFollowStatus(choir.id, userId)
        }
        const followers_count = await getFollowersCount(choir.id)

        res.json(formatChoirImageUrl({
            ...choir,
            membership,
            is_following,
            followers_count
        }, req))
    } catch (error) {
        next(error)
    }
}

export const update = async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, description, is_public, place, country } = req.body
        const isPublic = parseBoolean(is_public)

        const existingChoir = await findChoirById(id)
        if (!existingChoir) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        let imageFile = undefined
        if (req.file) {
            if (existingChoir.image_file) {
                await deleteFile(existingChoir.image_file, 'choirs')
            }
            imageFile = await uploadFile(req.file, 'choirs')
        }

        // Llamar al servicio para actualizar el coro
        const updatedChoir = await updateChoir(id, {
            name,
            description,
            image_file: imageFile,
            is_public: isPublic,
            place: place !== undefined ? (place || null) : undefined,
            country: country !== undefined ? (country || null) : undefined,
        })

        res.json({
            message: 'Coro actualizado correctamente',
            choir: formatChoirImageUrl(updatedChoir, req)
        })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                message: 'Ya existe un coro con ese nombre'
            })
        }
        next(error)
    }
}

export const remove = async (req, res, next) => {
    try {
        const { id } = req.params
        const choir = await findChoirById(id)
        if (choir && choir.image_file) {
            await deleteFile(choir.image_file, 'choirs')
        }

        const deletedRows = await deleteChoir(id)
        if (deletedRows === 0) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        res.json({
            message: 'Coro y sus recursos asociados eliminados correctamente'
        })
    } catch (error) {
        next(error)
    }
}

export const getUserChoirs = async (req, res, next) => {
    try {
        const userId = req.user.id
        const choirs = await findChoirsByUser(userId)
        
        const data = choirs.map(choir => {
            const formatted = formatChoirImageUrl(choir, req)
            formatted.membership = {
                role: choir.user_role,
                status: choir.user_status
            }
            return formatted
        })
        
        res.json({ data })
    } catch (error) {
        next(error)
    }
}

export const getExternalUserChoirs = async (req, res, next) => {
    try {
        const identifier = req.params.username
        let user;
        if (!isNaN(identifier)) {
            user = await findUserById(Number(identifier));
        } else {
            user = await findUserByUsername(identifier);
        }

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' })
        }
        
        const choirs = await findChoirsByUser(user.id)
        const data = choirs.map(choir => {
            const formatted = formatChoirImageUrl(choir, req)
            formatted.membership = {
                role: choir.user_role,
                status: choir.user_status
            }
            return formatted
        })
        
        res.json({ data })
    } catch (error) {
        next(error)
    }
}

export const follow = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const userId = req.user.id
        
        const choir = await findChoirById(choirId)
        if (!choir) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        try {
            await followChoir(choirId, userId)
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Ya sigues a este coro' })
            }
            throw error
        }

        const followersCount = await getFollowersCount(choirId)

        res.json({
            message: 'Ahora sigues a este coro',
            is_following: true,
            followers_count: followersCount
        })
    } catch (error) {
        next(error)
    }
}

export const unfollow = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const userId = req.user.id

        const choir = await findChoirById(choirId)
        if (!choir) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        await unfollowChoir(choirId, userId)
        const followersCount = await getFollowersCount(choirId)

        res.json({
            message: 'Has dejado de seguir a este coro',
            is_following: false,
            followers_count: followersCount
        })
    } catch (error) {
        next(error)
    }
}

export const getFollowedChoirs = async (req, res, next) => {
    try {
        const userId = req.user.id
        const choirs = await findFollowedChoirsByUser(userId)
        const data = choirs.map(choir => formatChoirImageUrl(choir, req))
        res.json({ data })
    } catch (error) {
        next(error)
    }
}

export const listFollowers = async (req, res, next) => {
    try {
        const choirId = req.params.id
        
        const choir = await findChoirById(choirId)
        if (!choir) {
            return res.status(404).json({ message: 'Coro no encontrado' })
        }

        const followers = await getChoirFollowers(choirId)
        
        const baseUrl = `${req.protocol}://${req.get('host')}`
        const formatted = followers.map(f => {
            return {
                id: f.id,
                name: f.name,
                username: f.username,
                profile_image_url: f.user_image
                    ? `${baseUrl}/uploads/profiles/${f.user_image}`
                    : `${baseUrl}/assets/default-avatar.png`
            }
        })

        res.json({ data: formatted })
    } catch (error) {
        next(error)
    }
}

export const getExternalUserFollowedChoirs = async (req, res, next) => {
    try {
        const identifier = req.params.username
        let user;
        if (!isNaN(identifier)) {
            user = await findUserById(Number(identifier));
        } else {
            user = await findUserByUsername(identifier);
        }

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' })
        }
        
        const choirs = await findFollowedChoirsByUser(user.id)
        const data = choirs.map(choir => formatChoirImageUrl(choir, req))
        res.json({ data })
    } catch (error) {
        next(error)
    }
}
