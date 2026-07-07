import { supabase } from '../database/connection.js'

const BUCKET_NAME = 'choral-record'

/**
 * Sube un archivo en memoria (de multer) a Supabase Storage.
 * @param {Object} file - El objeto de archivo de multer (memoryStorage)
 * @param {string} folder - La carpeta dentro del bucket (ej: 'profiles', 'choirs', 'pieces', 'events')
 * @returns {Promise<string>} El nombre de archivo único generado
 */
export const uploadFile = async (file, folder) => {
    if (!file) return null

    // Generar un nombre único preservando la extensión
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const dotIndex = file.originalname ? file.originalname.lastIndexOf('.') : -1
    const fileExtension = dotIndex !== -1 ? file.originalname.substring(dotIndex) : ''
    const filename = `${file.fieldname || 'file'}-${uniqueSuffix}${fileExtension}`
    const filepath = `${folder}/${filename}`

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filepath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        })

    if (error) {
        console.error(`Error subiendo archivo a Supabase Storage (${filepath}):`, error)
        throw error
    }

    return filename
}

/**
 * Elimina un archivo de Supabase Storage.
 * @param {string} filename - El nombre del archivo a eliminar
 * @param {string} folder - La carpeta dentro del bucket
 */
export const deleteFile = async (filename, folder) => {
    if (!filename) return
    const filepath = `${folder}/${filename}`
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filepath])

    if (error) {
        console.warn(`No se pudo eliminar el archivo de Supabase Storage (${filepath}):`, error.message)
    }
}

/**
 * Genera la URL pública de un archivo en Supabase Storage.
 * @param {string} filename - El nombre del archivo
 * @param {string} folder - La carpeta dentro del bucket
 * @returns {string} La URL pública
 */
export const getPublicUrl = (filename, folder) => {
    if (!filename) return null
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${folder}/${filename}`
}
