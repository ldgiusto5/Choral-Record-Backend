import { supabase } from '../database/connection.js'

export const requireChoirMember = async (req, res, next) => {
    try {
        const choirId = req.params.id || req.params.choirId || req.body.choirId
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' })
        }

        if (!choirId) {
            return res.status(400).json({ message: 'ID del coro no especificado' })
        }

        const { data, error } = await supabase
            .from('choir_members')
            .select('role, status')
            .eq('choir_id', choirId)
            .eq('user_id', userId)
            .maybeSingle()

        if (error) throw error

        if (!data || data.status !== 'accepted') {
            return res.status(403).json({
                message: 'No tienes acceso a este coro. Debes ser un miembro aceptado.'
            })
        }

        req.choirMember = data
        next()
    } catch (error) {
        next(error)
    }
}

export const requireChoirAdmin = async (req, res, next) => {
    try {
        const choirId = req.params.id || req.params.choirId || req.body.choirId
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' })
        }

        if (!choirId) {
            return res.status(400).json({ message: 'ID del coro no especificado' })
        }

        const { data, error } = await supabase
            .from('choir_members')
            .select('role, status')
            .eq('choir_id', choirId)
            .eq('user_id', userId)
            .maybeSingle()

        if (error) throw error

        if (!data || data.status !== 'accepted' || data.role !== 'admin') {
            return res.status(403).json({
                message: 'Acceso denegado. Se requieren permisos de administrador del coro.'
            })
        }

        req.choirMember = data
        next()
    } catch (error) {
        next(error)
    }
}
