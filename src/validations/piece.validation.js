import { body, param } from 'express-validator'

export const createPieceValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre de la pieza es obligatorio')
        .isLength({ min: 2, max: 150 })
        .withMessage('El nombre de la pieza debe tener entre 2 y 150 caracteres')
]

export const updatePieceValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    param('pieceId')
        .isInt()
        .withMessage('El ID de la pieza debe ser un número entero'),
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('El nombre de la pieza no puede estar vacío')
        .isLength({ min: 2, max: 150 })
        .withMessage('El nombre de la pieza debe tener entre 2 y 150 caracteres')
]

export const pieceIdValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    param('pieceId')
        .isInt()
        .withMessage('El ID de la pieza debe ser un número entero')
]

export const swapPieceValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    param('pieceId')
        .isInt()
        .withMessage('El ID de la pieza debe ser un número entero'),
    body('targetPieceId')
        .isInt()
        .withMessage('El ID de la pieza destino debe ser un número entero')
]

export const reorderPieceValidation = [
    param('id')
        .isInt()
        .withMessage('El ID del coro debe ser un número entero'),
    param('pieceId')
        .isInt()
        .withMessage('El ID de la pieza debe ser un número entero'),
    body('newOrder')
        .isInt({ min: 1 })
        .withMessage('El nuevo orden debe ser un número entero positivo')
]
