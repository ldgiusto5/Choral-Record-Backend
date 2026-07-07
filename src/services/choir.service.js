import { supabase } from '../database/connection.js'

const mapChoirStats = async (choir) => {
    if (!choir) return null

    // 1. member_count
    const { count: memberCount, error: err1 } = await supabase
        .from('choir_members')
        .select('*', { count: 'exact', head: true })
        .eq('choir_id', choir.id)
        .eq('status', 'accepted')

    // 2. piece_count
    const { count: pieceCount, error: err2 } = await supabase
        .from('pieces')
        .select('*', { count: 'exact', head: true })
        .eq('choir_id', choir.id)

    // 3. public_event_count and member_event_count (excluding completed events)
    const { data: events, error: err3 } = await supabase
        .from('events')
        .select('is_public, is_visible, is_completed, event_date')
        .eq('choir_id', choir.id)
        .eq('is_visible', true)

    const activeEvents = (events || []).filter(e => {
        const eventDate = e.event_date ? new Date(e.event_date) : null
        const currentDate = new Date()
        const eventDateOnly = eventDate ? new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()) : null
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        const dateCompleted = eventDateOnly ? currentDateOnly > eventDateOnly : false
        return !e.is_completed && !dateCompleted
    })

    const publicEventCount = activeEvents.filter(e => e.is_public).length
    const memberEventCount = activeEvents.length

    // 4. followers_count
    const { count: followersCount, error: err4 } = await supabase
        .from('choir_followers')
        .select('*', { count: 'exact', head: true })
        .eq('choir_id', choir.id)

    // 5. Get Owner name
    let ownerName = choir.creator_name
    if (choir.created_by) {
        const { data: ownerUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', choir.created_by)
            .maybeSingle()
        if (ownerUser) ownerName = ownerUser.name
    }

    return {
        ...choir,
        owner: ownerName,
        member_count: memberCount || 0,
        piece_count: pieceCount || 0,
        public_event_count: publicEventCount,
        member_event_count: memberEventCount,
        followers_count: followersCount || 0
    }
}

export const createChoir = async ({ name, description, image_file, place, country, created_by, createdBy, creator_name, is_public, isPublic }) => {
    const creatorId = createdBy || created_by
    const visibility = isPublic !== undefined ? isPublic : (is_public !== undefined ? is_public : true)

    // Check duplicate name (case-insensitive)
    const { data: existingName } = await supabase
        .from('choirs')
        .select('id')
        .ilike('name', name)
        .maybeSingle()

    if (existingName) {
        const err = new Error('Ya existe un coro con ese nombre')
        err.code = 'ER_DUP_ENTRY'
        throw err
    }

    const { data, error } = await supabase
        .from('choirs')
        .insert([
            {
                name,
                description: description || null,
                image_file: image_file || null,
                place: place || null,
                country: country || null,
                created_by: creatorId || null,
                creator_name: creator_name || '',
                is_public: Boolean(visibility)
            }
        ])
        .select()
        .single()

    if (error) {
        console.error('Error in createChoir:', error)
        throw error
    }

    // Auto join as admin
    if (creatorId) {
        const { error: joinError } = await supabase.from('choir_members').insert([
            {
                choir_id: data.id,
                user_id: creatorId,
                role: 'admin',
                status: 'accepted'
            }
        ])
        if (joinError) {
            console.error('Error joining as admin:', joinError)
        }

        // Auto follow
        const { error: followError } = await supabase.from('choir_followers').insert([
            {
                choir_id: data.id,
                user_id: creatorId
            }
        ])
        if (followError) {
            console.error('Error auto-following on creation:', followError)
        }
    }

    return data
}

export const updateChoir = async (id, updateData) => {
    if (updateData.name) {
        const { data: existingName } = await supabase
            .from('choirs')
            .select('id')
            .ilike('name', updateData.name)
            .neq('id', id)
            .maybeSingle()

        if (existingName) {
            const err = new Error('Ya existe un coro con ese nombre')
            err.code = 'ER_DUP_ENTRY'
            throw err
        }
    }

    const { data, error } = await supabase
        .from('choirs')
        .update(updateData)
        .eq('id', id)
        .select()

    if (error) {
        console.error('Error in updateChoir:', error)
        throw error
    }
    return data ? data.length : 0
}

export const deleteChoir = async (id) => {
    const { data: choir, error: findError } = await supabase
        .from('choirs')
        .select('id')
        .eq('id', id)
        .maybeSingle()

    if (findError) throw findError
    if (!choir) {
        throw new Error('Coro no encontrado')
    }

    const { data, error } = await supabase
        .from('choirs')
        .delete()
        .eq('id', id)
        .select()

    if (error) {
        console.error('Error in deleteChoir:', error)
        throw error
    }
    return data ? data.length : 0
}

export const findAllChoirs = async () => {
    const { data, error } = await supabase
        .from('choirs')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error in findAllChoirs:', error)
        throw error
    }

    return await Promise.all((data || []).map(c => mapChoirStats(c)))
}

export const findChoirById = async (idOrName) => {
    let query = supabase.from('choirs').select('*')
    if (idOrName !== undefined && idOrName !== null && !isNaN(idOrName) && Number.isInteger(Number(idOrName))) {
        query = query.eq('id', Number(idOrName))
    } else {
        query = query.eq('name', idOrName)
    }
    const { data, error } = await query.maybeSingle()

    if (error) {
        console.error('Error in findChoirById:', error)
        throw error
    }
    if (!data) return null

    let ownerName = data.creator_name
    if (data.created_by) {
        const { data: ownerUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', data.created_by)
            .maybeSingle()
        if (ownerUser) ownerName = ownerUser.name
    }

    return {
        ...data,
        owner: ownerName,
        owner_id: data.created_by
    }
}

export const findUserChoirStatus = async (choirId, userId) => {
    const { data, error } = await supabase
        .from('choir_members')
        .select('status, role')
        .eq('choir_id', choirId)
        .eq('user_id', userId)
        .maybeSingle()

    if (error) {
        console.error('Error in findUserChoirStatus:', error)
        throw error
    }
    return data || null
}

export const findChoirsByUser = async (userId) => {
    const { data: memberships, error: memberErr } = await supabase
        .from('choir_members')
        .select('choir_id, role, status')
        .eq('user_id', userId)
        .eq('status', 'accepted')

    if (memberErr) throw memberErr
    if (!memberships || memberships.length === 0) return []

    const choirIds = memberships.map(m => m.choir_id)

    const { data: choirs, error: choirErr } = await supabase
        .from('choirs')
        .select('*')
        .in('id', choirIds)
        .order('created_at', { ascending: false })

    if (choirErr) throw choirErr

    return await Promise.all((choirs || []).map(async c => {
        const membership = memberships.find(m => m.choir_id === c.id)
        const stats = await mapChoirStats(c)
        return {
            ...stats,
            user_role: membership?.role,
            user_status: membership?.status
        }
    }))
}

export const followChoir = async (choirId, userId) => {
    const { error } = await supabase
        .from('choir_followers')
        .insert([{ choir_id: choirId, user_id: userId }])

    if (error) {
        console.error('Error in followChoir:', error)
        throw error
    }
}

export const unfollowChoir = async (choirId, userId) => {
    const { error } = await supabase
        .from('choir_followers')
        .delete()
        .eq('choir_id', choirId)
        .eq('user_id', userId)

    if (error) {
        console.error('Error in unfollowChoir:', error)
        throw error
    }
}

export const getFollowStatus = async (choirId, userId) => {
    if (!userId) return false
    const { data, error } = await supabase
        .from('choir_followers')
        .select('id')
        .eq('choir_id', choirId)
        .eq('user_id', userId)
        .maybeSingle()

    if (error) return false
    return !!data
}

export const getFollowersCount = async (choirId) => {
    const { count, error } = await supabase
        .from('choir_followers')
        .select('*', { count: 'exact', head: true })
        .eq('choir_id', choirId)

    if (error) return 0
    return count || 0
}

export const findFollowedChoirsByUser = async (userId) => {
    const { data: follows, error: followErr } = await supabase
        .from('choir_followers')
        .select('choir_id')
        .eq('user_id', userId)

    if (followErr) throw followErr
    if (!follows || follows.length === 0) return []

    const choirIds = follows.map(f => f.choir_id)

    const { data: choirs, error: choirErr } = await supabase
        .from('choirs')
        .select('*')
        .in('id', choirIds)
        .order('created_at', { ascending: false })

    if (choirErr) throw choirErr

    return await Promise.all((choirs || []).map(c => mapChoirStats(c)))
}

export const getChoirFollowers = async (choirId) => {
    const { data, error } = await supabase
        .from('choir_followers')
        .select(`
            created_at,
            users (
                id,
                name,
                username,
                user_image
            )
        `)
        .eq('choir_id', choirId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error in getChoirFollowers:', error)
        throw error
    }

    return (data || []).map(row => ({
        id: row.users?.id,
        name: row.users?.name,
        username: row.users?.username,
        user_image: row.users?.user_image
    })).filter(u => u.id !== undefined)
}
