import { body, param } from 'express-validator'

export const createEventValidation = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('El título del evento es obligatorio')
        .isLength({ min: 2, max: 255 })
        .withMessage('El título debe tener entre 2 y 255 caracteres'),

    body('description')
        .optional()
        .trim(),

    body('event_date')
        .trim()
        .notEmpty()
        .withMessage('La fecha del evento es obligatoria')
        .isISO8601()
        .withMessage('La fecha del evento debe ser una fecha y hora válida (formato ISO 8601)'),

    body('is_visible')
        .optional()
        .customSanitizer(val => val === 'true' || val === '1' || val === true)
        .isBoolean()
        .withMessage('is_visible debe ser un valor booleano'),

    body('is_public')
        .optional()
        .customSanitizer(val => val === 'true' || val === '1' || val === true)
        .isBoolean()
        .withMessage('is_public debe ser un valor booleano'),

    body('is_completed')
        .optional()
        .customSanitizer(val => val === 'true' || val === '1' || val === true)
        .isBoolean()
        .withMessage('is_completed debe ser un valor booleano')
]

export const updateEventValidation = [
    param('eventId')
        .isInt()
        .withMessage('El ID del evento debe ser un número entero'),

    body('title')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('El título debe tener entre 2 y 255 caracteres'),

    body('description')
        .optional()
        .trim(),

    body('event_date')
        .optional()
        .trim()
        .isISO8601()
        .withMessage('La fecha del evento debe ser una fecha y hora válida (formato ISO 8601)'),

    body('is_visible')
        .optional()
        .customSanitizer(val => val === 'true' || val === '1' || val === true)
        .isBoolean()
        .withMessage('is_visible debe ser un valor booleano'),

    body('is_public')
        .optional()
        .customSanitizer(val => val === 'true' || val === '1' || val === true)
        .isBoolean()
        .withMessage('is_public debe ser un valor booleano'),

    body('is_completed')
        .optional()
        .customSanitizer(val => val === 'true' || val === '1' || val === true)
        .isBoolean()
        .withMessage('is_completed debe ser un valor booleano')
]
