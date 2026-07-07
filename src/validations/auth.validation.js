import { body } from 'express-validator'

export const registerValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('El nombre de usuario es obligatorio')
        .custom((value) => {
            if (/^\d+$/.test(value)) {
                throw new Error('El nombre de usuario no puede contener solo números');
            }
            return true;
        }),

    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre es obligatorio'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('El email no es válido'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
]

export const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('El email no es válido'),

    body('password')
        .notEmpty()
        .withMessage('La contraseña es obligatoria')
]