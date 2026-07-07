import { body, param } from 'express-validator'

export const createChoirValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre del coro es obligatorio')
        .isLength({ min: 2, max: 150 })
        .withMessage('El nombre debe tener entre 2 y 150 caracteres'),

    body('description')
        .optional()
        .trim(),
    
    body('is_public')
        .optional()
        .isBoolean()
        .withMessage('is_public debe ser un valor booleano')
]

export const choirIdValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero')
]

export const updateMemberStatusValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    param('userId')
        .isInt()
        .withMessage('El ID del usuario debe ser un número entero'),
    body('status')
        .isIn(['accepted', 'rejected'])
        .withMessage('El estado debe ser accepted o rejected')
]

export const updateMemberRoleValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    param('userId')
        .isInt()
        .withMessage('El ID del usuario debe ser un número entero'),
    body('role')
        .isIn(['admin', 'member'])
        .withMessage('El rol debe ser admin o member')
]

export const updateChoirValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage('El nombre debe tener entre 2 y 150 caracteres'),
    body('description')
        .optional()
        .trim(),
    body('is_public')
        .optional()
        .isBoolean()
        .withMessage('is_public debe ser un valor booleano')
]
