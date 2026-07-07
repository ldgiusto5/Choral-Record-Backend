import { supabase } from '../database/connection.js'

// Obtiene el siguiente número de order para una pieza en un coro
const getNextOrderForChoir = async (choirId) => {
    const { data, error } = await supabase
        .from('pieces')
        .select('order')
        .eq('choir_id', choirId)

    if (error) throw error
    if (!data || data.length === 0) return 1

    const maxOrder = Math.max(...data.map(p => p.order || 0))
    return maxOrder + 1
}

export const insertPiece = async (pieceData) => {
    const {
        choirId,
        name,
        partitura_file,
        voz_coral_file,
        voz_soprano_file,
        voz_soprano_2_file,
        voz_contralto_file,
        voz_contralto_2_file,
        voz_tenor_file,
        voz_tenor_2_file,
        voz_bajo_file,
        voz_bajo_2_file,
        base_instrumental_file,
        info_adicional_file,
        is_visible,
        has_lyrics,
        lyrics,
        has_div_soprano,
        has_div_contralto,
        has_div_tenor,
        has_div_bajo,
        createdBy
    } = pieceData

    // Obtener el siguiente número de order
    const order = await getNextOrderForChoir(choirId)

    const { data, error } = await supabase
        .from('pieces')
        .insert([
            {
                choir_id: choirId,
                name,
                order,
                partitura_file: partitura_file || null,
                voz_coral_file: voz_coral_file || null,
                voz_soprano_file: voz_soprano_file || null,
                voz_soprano_2_file: voz_soprano_2_file || null,
                voz_contralto_file: voz_contralto_file || null,
                voz_contralto_2_file: voz_contralto_2_file || null,
                voz_tenor_file: voz_tenor_file || null,
                voz_tenor_2_file: voz_tenor_2_file || null,
                voz_bajo_file: voz_bajo_file || null,
                voz_bajo_2_file: voz_bajo_2_file || null,
                base_instrumental_file: base_instrumental_file || null,
                info_adicional_file: info_adicional_file || null,
                is_visible: is_visible === undefined ? true : Boolean(is_visible),
                has_lyrics: Boolean(has_lyrics),
                lyrics: lyrics || null,
                has_div_soprano: Boolean(has_div_soprano),
                has_div_contralto: Boolean(has_div_contralto),
                has_div_tenor: Boolean(has_div_tenor),
                has_div_bajo: Boolean(has_div_bajo),
                created_by: createdBy
            }
        ])
        .select()
        .single()

    if (error) {
        console.error('Error in insertPiece:', error)
        throw error
    }

    return {
        id: data.id,
        order,
        ...pieceData
    }
}

export const findPiecesByChoir = async (choirId) => {
    const { data, error } = await supabase
        .from('pieces')
        .select(`
            *,
            users (
                name
            )
        `)
        .eq('choir_id', choirId)
        .order('order', { ascending: true })

    if (error) {
        console.error('Error in findPiecesByChoir:', error)
        throw error
    }

    return (data || []).map(row => ({
        ...row,
        creator_name: row.users?.name
    }))
}

export const findPieceById = async (pieceId) => {
    const { data, error } = await supabase
        .from('pieces')
        .select(`
            *,
            users (
                name
            )
        `)
        .eq('id', pieceId)
        .maybeSingle()

    if (error) {
        console.error('Error in findPieceById:', error)
        throw error
    }

    if (!data) return null
    return {
        ...data,
        creator_name: data.users?.name
    }
}

export const updatePiece = async (pieceId, updateData) => {
    const { data, error } = await supabase
        .from('pieces')
        .update(updateData)
        .eq('id', pieceId)
        .select()

    if (error) {
        console.error('Error in updatePiece:', error)
        throw error
    }
    return data ? data.length : 0
}

export const deletePiece = async (pieceId) => {
    const { data, error } = await supabase
        .from('pieces')
        .delete()
        .eq('id', pieceId)
        .select()

    if (error) {
        console.error('Error in deletePiece:', error)
        throw error
    }
    return data ? data.length : 0
}

// Intercambia el orden de dos piezas
export const swapPiecesOrder = async (pieceId1, pieceId2) => {
    const { data: piece1, error: err1 } = await supabase
        .from('pieces')
        .select('order, choir_id')
        .eq('id', pieceId1)
        .single()

    const { data: piece2, error: err2 } = await supabase
        .from('pieces')
        .select('order, choir_id')
        .eq('id', pieceId2)
        .single()

    if (err1 || err2 || !piece1 || !piece2) {
        throw new Error('Una o ambas piezas no existen')
    }

    if (piece1.choir_id !== piece2.choir_id) {
        throw new Error('Las piezas no pertenecen al mismo coro')
    }

    const order1 = piece1.order
    const order2 = piece2.order

    // Swap orders using a temporary negative order to avoid unique constraints
    const { error: e1 } = await supabase.from('pieces').update({ order: -order1 }).eq('id', pieceId1)
    if (e1) throw e1

    const { error: e2 } = await supabase.from('pieces').update({ order: order1 }).eq('id', pieceId2)
    if (e2) {
        await supabase.from('pieces').update({ order: order1 }).eq('id', pieceId1)
        throw e2
    }

    const { error: e3 } = await supabase.from('pieces').update({ order: order2 }).eq('id', pieceId1)
    if (e3) throw e3

    return true
}

// Reordena una pieza a una posición específica
export const reorderPiece = async (pieceId, newOrder) => {
    const { data: piece, error: err } = await supabase
        .from('pieces')
        .select('order, choir_id')
        .eq('id', pieceId)
        .single()

    if (err || !piece) {
        throw new Error('Pieza no encontrada')
    }

    const currentOrder = piece.order
    const choirId = piece.choir_id

    // Set target piece to a negative order first
    const { error: tempErr } = await supabase.from('pieces').update({ order: -currentOrder }).eq('id', pieceId)
    if (tempErr) throw tempErr

    if (newOrder > currentOrder) {
        const { data: list, error: listErr } = await supabase
            .from('pieces')
            .select('id, order')
            .eq('choir_id', choirId)
            .gt('order', currentOrder)
            .lte('order', newOrder)

        if (listErr) throw listErr

        for (const item of list) {
            await supabase.from('pieces').update({ order: item.order - 1 }).eq('id', item.id)
        }
    } else if (newOrder < currentOrder) {
        const { data: list, error: listErr } = await supabase
            .from('pieces')
            .select('id, order')
            .eq('choir_id', choirId)
            .gte('order', newOrder)
            .lt('order', currentOrder)

        if (listErr) throw listErr

        for (const item of list) {
            await supabase.from('pieces').update({ order: item.order + 1 }).eq('id', item.id)
        }
    }

    // Set target piece to newOrder
    const { error: finalErr } = await supabase.from('pieces').update({ order: newOrder }).eq('id', pieceId)
    if (finalErr) throw finalErr

    return true
}
