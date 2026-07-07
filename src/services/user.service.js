import { supabase } from '../database/connection.js'

/**
 * Checks whether the user is the sole admin of any choir.
 * Returns true if the user is sole admin for at least one choir.
 */
const isSoleAdminInAnyChoir = async (userId) => {
    // 1. Get all choir IDs where the user is an accepted admin
    const { data: userChoirs, error: userChoirsError } = await supabase
        .from('choir_members')
        .select('choir_id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .eq('status', 'accepted')

    if (userChoirsError) throw userChoirsError
    if (!userChoirs || userChoirs.length === 0) return false

    const choirIds = userChoirs.map(c => c.choir_id)

    // 2. Get all admin members for those choirs to count them
    const { data: adminCounts, error: countError } = await supabase
        .from('choir_members')
        .select('choir_id')
        .in('choir_id', choirIds)
        .eq('role', 'admin')
        .eq('status', 'accepted')

    if (countError) throw countError

    // Group and count
    const counts = {}
    adminCounts.forEach(member => {
        counts[member.choir_id] = (counts[member.choir_id] || 0) + 1
    })

    // Check if any has count === 1
    return Object.values(counts).some(count => count === 1)
}

/**
 * Hard delete a user after cleaning up related data.
 */
export const hardDeleteUser = async (userId) => {
    // 1. Verify user exists
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

    if (userError) throw userError
    if (!user) {
        throw new Error('Usuario no encontrado')
    }

    // Prevent deletion of administrators
    if (user.role === 'admin') {
        throw new Error('No se puede eliminar a un usuario con rol de administrador')
    }

    // Prevent deletion if sole admin of a choir
    const isSole = await isSoleAdminInAnyChoir(userId)
    if (isSole) {
        throw new Error('No se puede eliminar el usuario porque es el único administrador de un coro')
    }

    // Remove membership records
    const { error: membersDeleteError } = await supabase
        .from('choir_members')
        .delete()
        .eq('user_id', userId)

    if (membersDeleteError) throw membersDeleteError

    // Delete the user record itself
    const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

    if (userDeleteError) throw userDeleteError

    return true
}
