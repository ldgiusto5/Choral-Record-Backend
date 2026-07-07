import { supabase } from '../database/connection.js'
import fs from 'fs'
import path from 'path'

const mapEventRow = (row) => {
    if (!row) return null
    
    // Dynamically calculate is_completed
    const eventDate = row.event_date ? new Date(row.event_date) : null
    const currentDate = new Date()
    // Compare dates ignoring time
    const eventDateOnly = eventDate ? new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()) : null
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    
    const dateCompleted = eventDateOnly ? currentDateOnly > eventDateOnly : false
    
    return {
        ...row,
        is_completed: Boolean(row.is_completed || dateCompleted),
        is_visible: Boolean(row.is_visible),
        is_public: Boolean(row.is_public)
    }
}

/**
 * Obtener un evento por su ID con cálculo dinámico de is_completed.
 */
export const findEventById = async (eventId) => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()

    if (error) {
        console.error('Error in findEventById:', error)
        throw error
    }
    return mapEventRow(data)
}

/**
 * Crear un nuevo evento en un coro.
 */
export const createEvent = async ({ choirId, title, description, image_file, event_date, is_visible, is_public, info_file, createdBy }) => {
    const { data, error } = await supabase
        .from('events')
        .insert([
            {
                choir_id: choirId,
                title,
                description: description || null,
                image_file: image_file || null,
                event_date,
                is_visible: is_visible === undefined ? true : Boolean(is_visible),
                is_public: is_public === undefined ? false : Boolean(is_public),
                info_file: info_file || null,
                created_by: createdBy
            }
        ])
        .select()
        .single()

    if (error) {
        console.error('Error in createEvent:', error)
        throw error
    }
    return mapEventRow(data)
}

/**
 * Obtener todos los eventos de un coro filtrados según el rol del usuario (visibilidad).
 */
export const findEventsByChoir = async (choirId, userId, isSuperAdmin = false) => {
    let userRole = 'member'

    if (isSuperAdmin) {
        userRole = 'admin'
    } else {
        const { data: memberRows, error: memberErr } = await supabase
            .from('choir_members')
            .select('role')
            .eq('choir_id', choirId)
            .eq('user_id', userId)
            .eq('status', 'accepted')

        if (memberErr) throw memberErr

        if (memberRows && memberRows.length > 0) {
            userRole = memberRows[0].role
        } else {
            const { data: choirRows, error: choirErr } = await supabase
                .from('choirs')
                .select('created_by')
                .eq('id', choirId)

            if (choirErr) throw choirErr

            if (choirRows && choirRows.length > 0 && choirRows[0].created_by === userId) {
                userRole = 'admin'
            } else {
                throw new Error('No eres miembro activo de este coro')
            }
        }
    }

    let query = supabase
        .from('events')
        .select('*')
        .eq('choir_id', choirId)

    if (userRole !== 'admin') {
        query = query.eq('is_visible', true)
    }

    const { data, error } = await query.order('event_date', { ascending: true })

    if (error) {
        console.error('Error in findEventsByChoir:', error)
        throw error
    }

    return (data || []).map(mapEventRow)
}

/**
 * Obtener todos los eventos públicos de un coro (accesible sin autenticación).
 */
export const findPublicEventsByChoir = async (choirId) => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('choir_id', choirId)
        .eq('is_public', true)
        .eq('is_visible', true)
        .order('event_date', { ascending: true })

    if (error) {
        console.error('Error in findPublicEventsByChoir:', error)
        throw error
    }
    return (data || []).map(mapEventRow)
}

/**
 * Actualizar los datos de un evento, borrando opcionalmente archivos obsoletos en disco.
 */
export const updateEvent = async (eventId, data) => {
    const event = await findEventById(eventId)
    if (!event) {
        throw new Error('Evento no encontrado')
    }

    // Borrar imagen anterior si se sube una nueva
    if (data.image_file !== undefined && event.image_file && data.image_file !== event.image_file) {
        const oldImagePath = path.join('src/uploads/events', event.image_file)
        try {
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath)
        } catch (err) {
            console.error('Error al eliminar imagen de evento anterior:', err)
        }
    }

    // Borrar archivo de información anterior si se sube uno nuevo
    if (data.info_file !== undefined && event.info_file && data.info_file !== event.info_file) {
        const oldInfoPath = path.join('src/uploads/events', event.info_file)
        try {
            if (fs.existsSync(oldInfoPath)) fs.unlinkSync(oldInfoPath)
        } catch (err) {
            console.error('Error al eliminar PDF de evento anterior:', err)
        }
    }

    const { data: updatedData, error } = await supabase
        .from('events')
        .update(data)
        .eq('id', eventId)
        .select()
        .single()

    if (error) {
        console.error('Error in updateEvent:', error)
        throw error
    }

    return mapEventRow(updatedData)
}

/**
 * Eliminar un evento y todos sus archivos asociados en disco.
 */
export const deleteEvent = async (eventId) => {
    const event = await findEventById(eventId)
    if (!event) {
        throw new Error('Evento no encontrado')
    }

    if (event.image_file) {
        const imagePath = path.join('src/uploads/events', event.image_file)
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath)
            }
        } catch (err) {
            console.error('Error al eliminar imagen de evento:', err)
        }
    }

    if (event.info_file) {
        const infoPath = path.join('src/uploads/events', event.info_file)
        try {
            if (fs.existsSync(infoPath)) {
                fs.unlinkSync(infoPath)
            }
        } catch (err) {
            console.error('Error al eliminar PDF de información de evento:', err)
        }
    }

    const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .select()

    if (error) {
        console.error('Error in deleteEvent:', error)
        throw error
    }
    return data ? data.length : 0
}

/**
 * Obtener todos los eventos visibles de los coros seguidos por un usuario.
 */
export const findFollowedChoirsEvents = async (userId) => {
    // 1. Get all choir IDs that the user follows
    const { data: followed, error: followedErr } = await supabase
        .from('choir_followers')
        .select('choir_id')
        .eq('user_id', userId)

    if (followedErr) throw followedErr
    if (!followed || followed.length === 0) return []

    const followedChoirIds = followed.map(f => f.choir_id)

    // 2. Get all choir memberships for the user
    const { data: memberships, error: memberErr } = await supabase
        .from('choir_members')
        .select('choir_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')

    if (memberErr) throw memberErr
    const memberChoirIds = memberships ? memberships.map(m => m.choir_id) : []

    // 3. Get all choirs owned by the user
    const { data: owned, error: ownedErr } = await supabase
        .from('choirs')
        .select('id')
        .eq('created_by', userId)

    if (ownedErr) throw ownedErr
    const ownedChoirIds = owned ? owned.map(c => c.id) : []

    // 4. Fetch visible events of these followed choirs
    const { data: events, error: eventsErr } = await supabase
        .from('events')
        .select(`
            *,
            choirs (
                name
            )
        `)
        .in('choir_id', followedChoirIds)
        .eq('is_visible', true)
        .order('event_date', { ascending: true })

    if (eventsErr) throw eventsErr

    // 5. Filter in memory by privacy permissions
    const allowedEvents = (events || []).filter(e => {
        const isPublic = Boolean(e.is_public)
        const isMember = memberChoirIds.includes(e.choir_id)
        const isOwner = ownedChoirIds.includes(e.choir_id)
        return isPublic || isMember || isOwner
    })

    return allowedEvents.map(e => ({
        ...mapEventRow(e),
        choir_name: e.choirs?.name
    }))
}
