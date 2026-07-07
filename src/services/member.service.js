import { supabase } from '../database/connection.js'

export const requestToJoinChoir = async (choirId, userId, isPublic = false) => {
    const status = isPublic ? 'accepted' : 'pending'
    const { data, error } = await supabase
        .from('choir_members')
        .insert([
            { choir_id: choirId, user_id: userId, status, role: 'member' }
        ])
        .select()
        .single()

    if (error) {
        console.error('Error in requestToJoinChoir:', error)
        throw error
    }

    // Auto follow if accepted immediately (public choir)
    if (status === 'accepted') {
        const { error: followError } = await supabase
            .from('choir_followers')
            .upsert({ choir_id: choirId, user_id: userId })
        if (followError) {
            console.error('Error auto-following on public join:', followError)
        }
    }

    return data.id
}

export const findPendingRequests = async (choirId) => {
    const { data, error } = await supabase
        .from('choir_members')
        .select(`
            user_id,
            created_at,
            users (
                name,
                username,
                email,
                user_image
            )
        `)
        .eq('choir_id', choirId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error in findPendingRequests:', error)
        throw error
    }

    return (data || []).map(row => ({
        user_id: row.user_id,
        name: row.users?.name,
        username: row.users?.username,
        email: row.users?.email,
        user_image: row.users?.user_image,
        created_at: row.created_at
    }))
}

export const updateRequestStatus = async (choirId, userId, status) => {
    const { data, error } = await supabase
        .from('choir_members')
        .update({ status })
        .eq('choir_id', choirId)
        .eq('user_id', userId)
        .select()

    if (error) {
        console.error('Error in updateRequestStatus:', error)
        throw error
    }

    // Auto follow if status updated to accepted
    if (status === 'accepted') {
        const { error: followError } = await supabase
            .from('choir_followers')
            .upsert({ choir_id: choirId, user_id: userId })
        if (followError) {
            console.error('Error auto-following on approval:', followError)
        }
    }

    return data ? data.length : 0
}

export const findChoirMembers = async (choirId) => {
    const { data, error } = await supabase
        .from('choir_members')
        .select(`
            user_id,
            role,
            created_at,
            users (
                name,
                username,
                email,
                user_image
            )
        `)
        .eq('choir_id', choirId)
        .eq('status', 'accepted')

    if (error) {
        console.error('Error in findChoirMembers:', error)
        throw error
    }

    // Map to flat structure and sort in JS
    const mapped = (data || []).map(row => ({
        user_id: row.user_id,
        name: row.users?.name,
        username: row.users?.username,
        email: row.users?.email,
        user_image: row.users?.user_image,
        role: row.role,
        created_at: row.created_at
    }))

    mapped.sort((a, b) => {
        if (a.role !== b.role) {
            return a.role.localeCompare(b.role)
        }
        return (a.name || '').localeCompare(b.name || '')
    })

    return mapped
}

export const updateMemberRole = async (choirId, userId, role) => {
    const { data, error } = await supabase
        .from('choir_members')
        .update({ role })
        .eq('choir_id', choirId)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .select()

    if (error) {
        console.error('Error in updateMemberRole:', error)
        throw error
    }
    return data ? data.length : 0
}

export const removeChoirMember = async (choirId, userId) => {
    const { data, error } = await supabase
        .from('choir_members')
        .delete()
        .eq('choir_id', choirId)
        .eq('user_id', userId)
        .select()

    if (error) {
        console.error('Error in removeChoirMember:', error)
        throw error
    }
    return data ? data.length : 0
}
