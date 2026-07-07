import { createEvent, findEventsByChoir, findEventById, updateEvent, deleteEvent, findPublicEventsByChoir, findFollowedChoirsEvents } from '../services/event.service.js'
import { supabase } from '../database/connection.js'
import { uploadFile, deleteFile, getPublicUrl } from '../services/storage.service.js'

const formatEventUrls = (event, req) => {
    if (!event) return null
    const formatted = { ...event }
    
    if (formatted.image_file) {
        formatted.image_url = getPublicUrl(formatted.image_file, 'events')
    } else {
        formatted.image_url = null
    }

    if (formatted.info_file) {
        formatted.info_url = getPublicUrl(formatted.info_file, 'events')
    } else {
        formatted.info_url = null
    }

    if (formatted.is_visible !== undefined) {
        formatted.is_visible = Boolean(formatted.is_visible)
    }
    if (formatted.is_public !== undefined) {
        formatted.is_public = Boolean(formatted.is_public)
    }
    if (formatted.is_completed !== undefined) {
        formatted.is_completed = Boolean(formatted.is_completed)
    }

    return formatted
}

// Limpia archivos temporales (no-op para memoryStorage)
const cleanupUploadedFiles = (files) => {}

export const create = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const createdBy = req.user.id
        const { title, description, event_date, is_visible, is_public } = req.body

        let imageFile = null
        let infoFile = null

        if (req.files?.image?.[0]) {
            imageFile = await uploadFile(req.files.image[0], 'events')
        }
        if (req.files?.info?.[0]) {
            infoFile = await uploadFile(req.files.info[0], 'events')
        }

        // Convertir is_visible a booleano si se envía
        let isVisible = undefined
        if (is_visible !== undefined) {
            isVisible = is_visible === 'true' || is_visible === '1' || is_visible === true
        }

        // Convertir is_public a booleano si se envía
        let isPublic = undefined
        if (is_public !== undefined) {
            isPublic = is_public === 'true' || is_public === '1' || is_public === true
        }

        const event = await createEvent({
            choirId,
            title,
            description,
            image_file: imageFile,
            event_date: event_date ? new Date(event_date) : null,
            is_visible: isVisible,
            is_public: isPublic,
            info_file: infoFile,
            createdBy
        })

        res.status(201).json({
            message: 'Evento creado correctamente',
            event: formatEventUrls(event, req)
        })
    } catch (error) {
        cleanupUploadedFiles(req.files)
        next(error)
    }
}

export const list = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const userId = req.user.id
        const isSuperAdmin = req.user.role === 'admin'

        const events = await findEventsByChoir(choirId, userId, isSuperAdmin)
        const data = events.map(event => formatEventUrls(event, req))

        res.json({ data })
    } catch (error) {
        next(error)
    }
}

export const getDetail = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const eventId = req.params.eventId

        const event = await findEventById(eventId)

        if (!event || Number(event.choir_id) !== Number(choirId)) {
            return res.status(404).json({ message: 'Evento no encontrado' })
        }

        // Verificar visibilidad para miembros no-administradores
        const isSuperAdmin = req.user.role === 'admin'
        let userRole = 'member'
        
        if (isSuperAdmin) {
            userRole = 'admin'
        } else {
            const { data: memberRows, error } = await supabase
                .from('choir_members')
                .select('role')
                .eq('choir_id', choirId)
                .eq('user_id', req.user.id)
                .eq('status', 'accepted')

            if (error) throw error
            if (memberRows && memberRows.length > 0) {
                userRole = memberRows[0].role
            }
        }

        if (userRole !== 'admin' && !event.is_visible) {
            return res.status(403).json({ message: 'No tienes permiso para ver este evento' })
        }

        res.json(formatEventUrls(event, req))
    } catch (error) {
        next(error)
    }
}

export const update = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const eventId = req.params.eventId
        const { title, description, event_date, is_visible, is_public, is_completed } = req.body

        const event = await findEventById(eventId)
        if (!event || Number(event.choir_id) !== Number(choirId)) {
            cleanupUploadedFiles(req.files)
            return res.status(404).json({ message: 'Evento no encontrado' })
        }

        const updateData = {}
        if (title !== undefined) updateData.title = title
        if (description !== undefined) updateData.description = description
        if (event_date !== undefined) updateData.event_date = event_date

        if (is_visible !== undefined) {
            updateData.is_visible = is_visible === 'true' || is_visible === '1' || is_visible === true
        }

        if (is_public !== undefined) {
            updateData.is_public = is_public === 'true' || is_public === '1' || is_public === true
        }

        if (is_completed !== undefined) {
            updateData.is_completed = is_completed === 'true' || is_completed === '1' || is_completed === true
        }

        const deleteImage = req.body.delete_image === 'true' || req.body.deleteImage === 'true'
        const deleteInfo = req.body.delete_info === 'true' || req.body.deleteInfo === 'true'
        let oldImageFileToDelete = null
        let oldInfoFileToDelete = null

        if (req.files?.image?.[0]) {
            const uploadedFilename = await uploadFile(req.files.image[0], 'events')
            updateData.image_file = uploadedFilename
            if (event.image_file) {
                oldImageFileToDelete = event.image_file
            }
        } else if (deleteImage) {
            updateData.image_file = null
            if (event.image_file) {
                oldImageFileToDelete = event.image_file
            }
        }

        if (req.files?.info?.[0]) {
            const uploadedFilename = await uploadFile(req.files.info[0], 'events')
            updateData.info_file = uploadedFilename
            if (event.info_file) {
                oldInfoFileToDelete = event.info_file
            }
        } else if (deleteInfo) {
            updateData.info_file = null
            if (event.info_file) {
                oldInfoFileToDelete = event.info_file
            }
        }

        const updatedEvent = await updateEvent(eventId, updateData)

        // Limpiar archivos anteriores de Supabase Storage
        if (oldImageFileToDelete) {
            await deleteFile(oldImageFileToDelete, 'events')
        }

        if (oldInfoFileToDelete) {
            await deleteFile(oldInfoFileToDelete, 'events')
        }

        res.json({
            message: 'Evento actualizado correctamente',
            event: formatEventUrls(updatedEvent, req)
        })
    } catch (error) {
        cleanupUploadedFiles(req.files)
        next(error)
    }
}

export const remove = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const eventId = req.params.eventId

        const event = await findEventById(eventId)
        if (!event || Number(event.choir_id) !== Number(choirId)) {
            return res.status(404).json({ message: 'Evento no encontrado o no pertenece a este coro' })
        }

        await deleteEvent(eventId)

        // Eliminar archivos del evento de Supabase Storage
        if (event.image_file) {
            await deleteFile(event.image_file, 'events')
        }
        if (event.info_file) {
            await deleteFile(event.info_file, 'events')
        }

        res.json({
            message: 'Evento eliminado correctamente'
        })
    } catch (error) {
        next(error)
    }
}

/**
 * Listar eventos públicos de un coro (accesible sin autenticación).
 * Solo devuelve eventos con is_public = true e is_visible = true.
 */
export const listPublic = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const events = await findPublicEventsByChoir(choirId)
        const data = events.map(event => formatEventUrls(event, req))
        res.json({ data })
    } catch (error) {
        next(error)
    }
}

export const listFollowedChoirsEvents = async (req, res, next) => {
    try {
        const userId = req.user.id
        const events = await findFollowedChoirsEvents(userId)
        const data = events.map(event => formatEventUrls(event, req))
        res.json({ data })
    } catch (error) {
        next(error)
    }
}
