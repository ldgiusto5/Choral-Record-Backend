import { supabase } from '../database/connection.js'

export const resolveChoirIdParam = async (req, res, next, idOrName) => {
    try {
        if (idOrName && isNaN(idOrName)) {
            const choirName = decodeURIComponent(idOrName);
            const { data: choir, error } = await supabase
                .from('choirs')
                .select('id')
                .eq('name', choirName)
                .maybeSingle();

            if (error) {
                console.error('Error resolving choir ID by name in param middleware:', error);
                return res.status(500).json({ message: 'Error interno al resolver el coro' });
            }

            if (!choir) {
                return res.status(404).json({ message: 'Coro no encontrado' });
            }

            req.params.id = String(choir.id);
        }
        next();
    } catch (err) {
        next(err);
    }
};
