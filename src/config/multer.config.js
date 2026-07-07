import multer from 'multer'

// Usar almacenamiento en memoria para delegar la persistencia a Supabase Storage
const storage = multer.memoryStorage()

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
        fileSize: 50 * 1024 * 1024 // Límite de 50MB por archivo
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
    storage,
    fileFilter: choirFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB
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
    storage,
    fileFilter: profileFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB
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
    storage,
    fileFilter: eventFileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // Límite de 15MB
    }
})