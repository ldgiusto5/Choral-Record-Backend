import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Asegurar que exista la carpeta de subida
const uploadDir = 'src/uploads/pieces'
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        // Generar un nombre único preservando la extensión
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        const extension = path.extname(file.originalname)
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`)
    }
})

const fileFilter = (req, file, cb) => {
    const docMimetypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    const audioMimetypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/ogg',
        'audio/x-m4a',
        'audio/m4a'
    ]

    const field = file.fieldname

    if (field === 'partitura' || field === 'infoAdicional') {
        if (!docMimetypes.includes(file.mimetype) && !file.mimetype.startsWith('image/')) {
            return cb(new Error(`Formato de archivo para '${field}' no permitido. Debe ser PDF, imagen o Word.`))
        }
    } else {
        // Campos de voz y base instrumental
        const isAudioMime = audioMimetypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')
        const hasAudioExt = file.originalname.match(/\.(mp3|wav|ogg|m4a)$/i)
        
        if (!isAudioMime && !hasAudioExt) {
            return cb(new Error(`Formato de archivo para '${field}' no permitido. Debe ser un archivo de audio (MP3, WAV, etc.).`))
        }
    }

    cb(null, true)
}

export const uploadPieceFiles = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // Límite de 15MB por archivo
    }
})

// Configuración para las fotos de los coros
const choirDir = 'src/uploads/choirs'
if (!fs.existsSync(choirDir)) {
    fs.mkdirSync(choirDir, { recursive: true })
}

const choirStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, choirDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        const extension = path.extname(file.originalname)
        cb(null, `choir-${uniqueSuffix}${extension}`)
    }
})

const choirFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Formato de imagen no permitido. Debe ser JPEG, PNG o WEBP.'))
    }
    cb(null, true)
}

export const uploadChoirImage = multer({
    storage: choirStorage,
    fileFilter: choirFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB para la foto de perfil del coro
    }
})

// Configuración para las fotos de perfil de usuarios
const profileDir = 'src/uploads/profiles'
if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true })
}

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        const extension = path.extname(file.originalname)
        cb(null, `profile-${uniqueSuffix}${extension}`)
    }
})

const profileFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Formato de imagen no permitido. Debe ser JPEG, PNG o WEBP.'))
    }
    cb(null, true)
}

export const uploadProfileImage = multer({
    storage: profileStorage,
    fileFilter: profileFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB para la foto de perfil
    }
})

// Configuración para los eventos (imagen y PDF de información)
const eventDir = 'src/uploads/events'
if (!fs.existsSync(eventDir)) {
    fs.mkdirSync(eventDir, { recursive: true })
}

const eventStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, eventDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        const extension = path.extname(file.originalname)
        cb(null, `event-${file.fieldname}-${uniqueSuffix}${extension}`)
    }
})

const eventFileFilter = (req, file, cb) => {
    const field = file.fieldname
    if (field === 'image') {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Formato de imagen para el evento no permitido. Debe ser JPEG, PNG o WEBP.'))
        }
    } else if (field === 'info') {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if (!allowedTypes.includes(file.mimetype) && !file.mimetype.startsWith('image/')) {
            return cb(new Error('Formato de archivo de información para el evento no permitido. Debe ser PDF, imagen o Word.'))
        }
    }
    cb(null, true)
}

export const uploadEventFiles = multer({
    storage: eventStorage,
    fileFilter: eventFileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // Límite de 15MB
    }
})