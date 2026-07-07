import { validationResult } from 'express-validator'

export const validateRequest = (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Datos inválidos',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        })
    }

    next()
}
