import fs from 'fs'
import path from 'path'
import {
    insertPiece,
    findPiecesByChoir,
    findPieceById,
    updatePiece,
    deletePiece,
    swapPiecesOrder,
    reorderPiece
} from '../services/piece.service.js'

const getYouTubeId = (url) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
}

const validateYouTubeUrl = async (url) => {
    const ytId = getYouTubeId(url)
    if (!ytId) {
        return { isValid: false, reason: 'El enlace no tiene un formato de video de YouTube válido.' }
    }

    try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`)
        if (res.status === 200) {
            return { isValid: true }
        }
        if (res.status === 401) {
            return { isValid: false, reason: 'El autor de este video ha deshabilitado su reproducción en reproductores externos.' }
        }
        if (res.status === 404) {
            return { isValid: false, reason: 'El video de YouTube no existe o es privado.' }
        }
        return { isValid: false, reason: `Error de validación de YouTube (Código: ${res.status}).` }
    } catch (err) {
        return { isValid: false, reason: 'No se pudo conectar con los servidores de YouTube para validar el video.' }
    }
}

// Limpia archivos subidos en caso de error en la petición
const cleanupUploadedFiles = (files) => {
    if (!files) return
    Object.values(files).forEach((fileArr) => {
        fileArr.forEach((file) => {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path)
                }
            } catch (err) {
                console.error(`Error eliminando archivo temporal: ${file.path}`, err)
            }
        })
    })
}

// Formatea las URLs públicas para que el frontend pueda reproducir/descargar
const formatPieceUrls = (piece, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/pieces/`
    const fileFields = [
        'partitura_file', 'voz_coral_file', 
        'voz_soprano_file', 'voz_soprano_2_file', 
        'voz_contralto_file', 'voz_contralto_2_file', 
        'voz_tenor_file', 'voz_tenor_2_file', 
        'voz_bajo_file', 'voz_bajo_2_file', 
        'base_instrumental_file', 'info_adicional_file'
    ]
    
    const formatted = { ...piece }
    fileFields.forEach(field => {
        if (formatted[field]) {
            const val = String(formatted[field])
            if (val.startsWith('http://') || val.startsWith('https://')) {
                formatted[field] = val
            } else {
                formatted[field] = `${baseUrl}${val}`
            }
        }
    })
    return formatted
}

export const create = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const createdBy = req.user.id
        const { 
            name, is_visible, has_lyrics, lyrics,
            has_div_soprano, has_div_contralto, has_div_tenor, has_div_bajo 
        } = req.body
        const isVisible = is_visible === 'false' || is_visible === '0' || is_visible === false ? 0 : 1
        const hasLyrics = has_lyrics === 'true' || has_lyrics === '1' || has_lyrics === true ? 1 : 0
        const hasDivSoprano = has_div_soprano === 'true' || has_div_soprano === '1' || has_div_soprano === true ? 1 : 0
        const hasDivContralto = has_div_contralto === 'true' || has_div_contralto === '1' || has_div_contralto === true ? 1 : 0
        const hasDivTenor = has_div_tenor === 'true' || has_div_tenor === '1' || has_div_tenor === true ? 1 : 0
        const hasDivBajo = has_div_bajo === 'true' || has_div_bajo === '1' || has_div_bajo === true ? 1 : 0

        const files = req.files || {}
        
        const getFieldValue = (fieldName, bodyName) => {
            const fileArr = files[fieldName]
            if (fileArr && fileArr.length > 0) {
                return fileArr[0].filename
            }
            const bodyVal = req.body[bodyName] || req.body[fieldName]
            if (bodyVal && String(bodyVal).trim() !== '') {
                return String(bodyVal).trim()
            }
            return null
        }

        const pieceData = {
            choirId,
            name,
            partitura_file: getFieldValue('partitura', 'partitura'),
            voz_coral_file: getFieldValue('vozCoral', 'voz_coral'),
            voz_soprano_file: getFieldValue('vozSoprano', 'voz_soprano'),
            voz_soprano_2_file: hasDivSoprano ? getFieldValue('vozSoprano2', 'voz_soprano_2') : null,
            voz_contralto_file: getFieldValue('vozContralto', 'voz_contralto'),
            voz_contralto_2_file: hasDivContralto ? getFieldValue('vozContralto2', 'voz_contralto_2') : null,
            voz_tenor_file: getFieldValue('vozTenor', 'voz_tenor'),
            voz_tenor_2_file: hasDivTenor ? getFieldValue('vozTenor2', 'voz_tenor_2') : null,
            voz_bajo_file: getFieldValue('vozBajo', 'voz_bajo'),
            voz_bajo_2_file: hasDivBajo ? getFieldValue('vozBajo2', 'voz_bajo_2') : null,
            base_instrumental_file: getFieldValue('baseInstrumental', 'base_instrumental'),
            info_adicional_file: hasLyrics ? null : getFieldValue('infoAdicional', 'info_adicional'),
            is_visible: isVisible,
            has_lyrics: hasLyrics,
            lyrics: hasLyrics ? (lyrics || null) : null,
            has_div_soprano: hasDivSoprano,
            has_div_contralto: hasDivContralto,
            has_div_tenor: hasDivTenor,
            has_div_bajo: hasDivBajo,
            createdBy
        }

        // Validar URLs de YouTube
        const audioFields = [
            { name: 'vozCoral', db: 'voz_coral_file', label: 'Voz Coral' },
            { name: 'baseInstrumental', db: 'base_instrumental_file', label: 'Base Instrumental' },
            { name: 'vozSoprano', db: 'voz_soprano_file', label: 'Voz Soprano' },
            { name: 'vozSoprano2', db: 'voz_soprano_2_file', label: 'Voz Soprano 2' },
            { name: 'vozContralto', db: 'voz_contralto_file', label: 'Voz Contralto' },
            { name: 'vozContralto2', db: 'voz_contralto_2_file', label: 'Voz Contralto 2' },
            { name: 'vozTenor', db: 'voz_tenor_file', label: 'Voz Tenor' },
            { name: 'vozTenor2', db: 'voz_tenor_2_file', label: 'Voz Tenor 2' },
            { name: 'vozBajo', db: 'voz_bajo_file', label: 'Voz Bajo' },
            { name: 'vozBajo2', db: 'voz_bajo_2_file', label: 'Voz Bajo 2' },
            { name: 'infoAdicional', db: 'info_adicional_file', label: 'Info Adicional' }
        ]

        for (const field of audioFields) {
            const val = pieceData[field.db]
            if (val && typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
                const validation = await validateYouTubeUrl(val)
                if (!validation.isValid) {
                    cleanupUploadedFiles(req.files)
                    return res.status(400).json({ message: `Error en ${field.label}: ${validation.reason}` })
                }
            }
        }

        const piece = await insertPiece(pieceData)

        res.status(201).json({
            message: 'Pieza creada correctamente',
            piece: formatPieceUrls(piece, req)
        })
    } catch (error) {
        cleanupUploadedFiles(req.files)
        next(error)
    }
}

export const list = async (req, res, next) => {
    try {
        const choirId = req.params.id
        const pieces = await findPiecesByChoir(choirId)
        
        const isAdmin = req.choirMember?.role === 'admin' || req.user?.role === 'admin'
        const filteredPieces = isAdmin 
            ? pieces 
            : pieces.filter(piece => piece.is_visible !== false && piece.is_visible !== 0)
        
        const data = filteredPieces.map(piece => formatPieceUrls(piece, req))
        res.json({ data })
    } catch (error) {
        next(error)
    }
}

export const getDetail = async (req, res, next) => {
    try {
        const { pieceId } = req.params
        const piece = await findPieceById(pieceId)

        if (!piece) {
            return res.status(404).json({ message: 'Pieza no encontrada' })
        }

        const isAdmin = req.choirMember?.role === 'admin' || req.user?.role === 'admin'
        if (!isAdmin && (piece.is_visible === false || piece.is_visible === 0)) {
            return res.status(403).json({ message: 'No tienes permiso para acceder a esta pieza' })
        }

        res.json(formatPieceUrls(piece, req))
    } catch (error) {
        next(error)
    }
}

export const update = async (req, res, next) => {
    try {
        const { pieceId } = req.params
        const { 
            name, is_visible, has_lyrics, lyrics,
            has_div_soprano, has_div_contralto, has_div_tenor, has_div_bajo
        } = req.body

        const existingPiece = await findPieceById(pieceId)
        if (!existingPiece) {
            cleanupUploadedFiles(req.files)
            return res.status(404).json({ message: 'Pieza no encontrada' })
        }

        const files = req.files || {}
        const updateData = {}
        const filesToDelete = []

        if (name) {
            updateData.name = name
        }

        if (is_visible !== undefined) {
            updateData.is_visible = is_visible === 'false' || is_visible === '0' || is_visible === false ? 0 : 1
        }

        if (has_lyrics !== undefined) {
            const hasLyricsVal = has_lyrics === 'true' || has_lyrics === '1' || has_lyrics === true ? 1 : 0
            updateData.has_lyrics = hasLyricsVal
            if (hasLyricsVal) {
                updateData.lyrics = lyrics || null
                if (existingPiece.info_adicional_file) {
                    filesToDelete.push(existingPiece.info_adicional_file)
                }
                updateData.info_adicional_file = null // Eliminar archivo adicional si se activa letras
            } else {
                updateData.lyrics = null
            }
        } else if (lyrics !== undefined) {
            updateData.lyrics = lyrics || null
        }

        if (has_div_soprano !== undefined) {
            updateData.has_div_soprano = has_div_soprano === 'true' || has_div_soprano === '1' || has_div_soprano === true ? 1 : 0
            if (!updateData.has_div_soprano && existingPiece.voz_soprano_2_file) {
                filesToDelete.push(existingPiece.voz_soprano_2_file)
                updateData.voz_soprano_2_file = null
            }
        }
        if (has_div_contralto !== undefined) {
            updateData.has_div_contralto = has_div_contralto === 'true' || has_div_contralto === '1' || has_div_contralto === true ? 1 : 0
            if (!updateData.has_div_contralto && existingPiece.voz_contralto_2_file) {
                filesToDelete.push(existingPiece.voz_contralto_2_file)
                updateData.voz_contralto_2_file = null
            }
        }
        if (has_div_tenor !== undefined) {
            updateData.has_div_tenor = has_div_tenor === 'true' || has_div_tenor === '1' || has_div_tenor === true ? 1 : 0
            if (!updateData.has_div_tenor && existingPiece.voz_tenor_2_file) {
                filesToDelete.push(existingPiece.voz_tenor_2_file)
                updateData.voz_tenor_2_file = null
            }
        }
        if (has_div_bajo !== undefined) {
            updateData.has_div_bajo = has_div_bajo === 'true' || has_div_bajo === '1' || has_div_bajo === true ? 1 : 0
            if (!updateData.has_div_bajo && existingPiece.voz_bajo_2_file) {
                filesToDelete.push(existingPiece.voz_bajo_2_file)
                updateData.voz_bajo_2_file = null
            }
        }

        const fileFields = [
            'partitura', 'vozCoral', 'vozSoprano', 'vozSoprano2',
            'vozContralto', 'vozContralto2', 'vozTenor', 'vozTenor2',
            'vozBajo', 'vozBajo2', 'baseInstrumental', 'infoAdicional'
        ]

        fileFields.forEach(field => {
            const fileArr = files[field]
            const dbField = `${field.replace(/([A-Z]|[0-9])/g, '_$1').toLowerCase()}_file`
            
            const isMarkedDelete = 
                req.body[`delete_${field}`] === 'true' || 
                req.body[`delete_${field}`] === true ||
                req.body[`delete_${field.replace(/([A-Z]|[0-9])/g, '_$1').toLowerCase()}`] === 'true' ||
                req.body[`delete_${field.replace(/([A-Z]|[0-9])/g, '_$1').toLowerCase()}`] === true;

            const bodyVal = req.body[field] || req.body[dbField]

            if (fileArr && fileArr.length > 0) {
                if (existingPiece[dbField] && !existingPiece[dbField].startsWith('http://') && !existingPiece[dbField].startsWith('https://')) {
                    filesToDelete.push(existingPiece[dbField])
                }
                updateData[dbField] = fileArr[0].filename
            } else if (bodyVal !== undefined) {
                const trimmedVal = String(bodyVal).trim()
                if (trimmedVal !== '') {
                    if (existingPiece[dbField] && !existingPiece[dbField].startsWith('http://') && !existingPiece[dbField].startsWith('https://')) {
                        filesToDelete.push(existingPiece[dbField])
                    }
                    updateData[dbField] = trimmedVal
                } else {
                    if (existingPiece[dbField] && !existingPiece[dbField].startsWith('http://') && !existingPiece[dbField].startsWith('https://')) {
                        filesToDelete.push(existingPiece[dbField])
                    }
                    updateData[dbField] = null
                }
            } else if (isMarkedDelete) {
                if (existingPiece[dbField] && !existingPiece[dbField].startsWith('http://') && !existingPiece[dbField].startsWith('https://')) {
                    filesToDelete.push(existingPiece[dbField])
                }
                updateData[dbField] = null
            }
        })

        // Validar URLs de YouTube
        const fieldLabels = {
            voz_coral_file: 'Voz Coral General',
            base_instrumental_file: 'Base Instrumental',
            voz_soprano_file: 'Voz Soprano',
            voz_soprano_2_file: 'Voz Soprano 2',
            voz_contralto_file: 'Voz Contralto',
            voz_contralto_2_file: 'Voz Contralto 2',
            voz_tenor_file: 'Voz Tenor',
            voz_tenor_2_file: 'Voz Tenor 2',
            voz_bajo_file: 'Voz Bajo',
            voz_bajo_2_file: 'Voz Bajo 2',
            info_adicional_file: 'Información Adicional'
        }

        for (const [dbField, val] of Object.entries(updateData)) {
            if (val && typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
                const validation = await validateYouTubeUrl(val)
                if (!validation.isValid) {
                    cleanupUploadedFiles(req.files)
                    const label = fieldLabels[dbField] || dbField
                    return res.status(400).json({ message: `Error en ${label}: ${validation.reason}` })
                }
            }
        }

        if (Object.keys(updateData).length > 0) {
            await updatePiece(pieceId, updateData)
        }

        // Borrar archivos reemplazados
        filesToDelete.forEach(filename => {
            if (filename.startsWith('http://') || filename.startsWith('https://')) return
            const filePath = path.join('src/uploads/pieces', filename)
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
            } catch (err) {
                console.error(`Error borrando archivo reemplazado: ${filePath}`, err)
            }
        })

        res.json({
            message: 'Pieza actualizada correctamente'
        })
    } catch (error) {
        cleanupUploadedFiles(req.files)
        next(error)
    }
}

export const remove = async (req, res, next) => {
    try {
        const { pieceId } = req.params
        const piece = await findPieceById(pieceId)

        if (!piece) {
            return res.status(404).json({ message: 'Pieza no encontrada' })
        }

        await deletePiece(pieceId)

        // Borrar todos los archivos físicos asociados
        const fileFields = [
            'partitura_file', 'voz_coral_file', 
            'voz_soprano_file', 'voz_soprano_2_file', 
            'voz_contralto_file', 'voz_contralto_2_file', 
            'voz_tenor_file', 'voz_tenor_2_file', 
            'voz_bajo_file', 'voz_bajo_2_file', 
            'base_instrumental_file', 'info_adicional_file'
        ]

        fileFields.forEach(field => {
            const filename = piece[field]
            if (filename && !filename.startsWith('http://') && !filename.startsWith('https://')) {
                const filePath = path.join('src/uploads/pieces', filename)
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath)
                    }
                } catch (err) {
                    console.error(`Error al borrar el archivo físico ${filePath}:`, err)
                }
            }
        })

        res.json({
            message: 'Pieza eliminada correctamente' 
        })
    } catch (error) {
        next(error)
    }
}

export const swap = async (req, res, next) => {
    try {
        const { pieceId } = req.params
        const { targetPieceId } = req.body

        if (!targetPieceId) {
            return res.status(400).json({ message: 'El ID de la pieza destino es requerido' })
        }

        if (pieceId === String(targetPieceId)) {
            return res.status(400).json({ message: 'No puedes intercambiar una pieza consigo misma' })
        }

        await swapPiecesOrder(pieceId, targetPieceId)

        res.json({
            message: 'Piezas reordenadas correctamente'
        })
    } catch (error) {
        if (error.message.includes('no existen')) {
            return res.status(404).json({ message: error.message })
        }
        if (error.message.includes('mismo coro')) {
            return res.status(400).json({ message: error.message })
        }
        next(error)
    }
}

export const reorder = async (req, res, next) => {
    try {
        const { pieceId } = req.params
        const { newOrder } = req.body

        if (newOrder === undefined || newOrder === null) {
            return res.status(400).json({ message: 'El nuevo orden es requerido' })
        }

        if (!Number.isInteger(newOrder) || newOrder < 1) {
            return res.status(400).json({ message: 'El orden debe ser un número entero positivo' })
        }

        await reorderPiece(pieceId, newOrder)

        res.json({
            message: 'Pieza reordenada correctamente'
        })
    } catch (error) {
        if (error.message.includes('no encontrada')) {
            return res.status(404).json({ message: error.message })
        }
        next(error)
    }
}
