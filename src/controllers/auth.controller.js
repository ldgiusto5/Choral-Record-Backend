import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { supabase } from '../database/connection.js'
import { sendVerificationEmail } from '../services/email.service.js'
import { findUserByEmail,
    createUser,
    findUserByUsername,
    findUserById,
    updateUser,
    searchUsers
 } from '../services/auth.service.js'
import { hardDeleteUser } from '../services/user.service.js'
import { createRefreshToken, findRefreshToken, deleteRefreshToken, deleteAllUserRefreshTokens } from '../services/token.service.js'
import { uploadFile, deleteFile, getPublicUrl } from '../services/storage.service.js'

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

const formatUserAvatarUrl = (user, req) => {
    if (!user) return null

    const formatted = { ...user }

    const baseUrl = `${req.protocol}://${req.get('host')}`

    formatted.profile_image_url = formatted.user_image
        ? getPublicUrl(formatted.user_image, 'profiles')
        : `${baseUrl}/assets/default-avatar.png`

    return formatted
}

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body

        const user = await findUserByEmail(email)

        if (!user) {
            return res.status(401).json({
		        message: "Usuario no existe",
			});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({
		        message: "Contraseña incorrecta",
			});        
		}

        if (!user.is_active) {
            return res.status(403).json({
                message: "Debes verificar tu correo electrónico para activar tu cuenta."
            })
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '2h'
            }
        )

        // Generate Refresh Token
        const refreshToken = crypto.randomBytes(64).toString('hex')
        const refreshTokenHash = hashToken(refreshToken)
        const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days (6 months)

        await createRefreshToken({
            userId: user.id,
            tokenHash: refreshTokenHash,
            expiresAt: expiresAt.toISOString()
        })

        res.json({
            message: 'Login correcto',
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al iniciar sesión",
        });
    }
}

export const profile = async (req, res) => {
    try {
        const identifier = req.params.username

        if (!identifier) {
            return res.status(400).json({ message: 'Identificador requerido' })
        }

        let user;
        if (!isNaN(identifier)) {
            user = await findUserById(Number(identifier));
        } else {
            user = await findUserByUsername(identifier);
        }

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' })
        }

        const formatted = formatUserAvatarUrl(user, req)

        // Indicar si el perfil pertenece al usuario autenticado
        const isOwner = req.user && req.user.id && Number(req.user.id) === Number(user.id)

        res.json({ ...formatted, isOwner })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error al buscar usuario' })
    }
}

export const register = async (req, res, next) => {
    try {
        const {username, name, email, password } = req.body

        const existingEmail = await findUserByEmail(email)

        if (existingEmail) {
            return res.status(400).json({
                message: "Email ya registrado",
            });
        }
        const existingUserName = await findUserByUsername(username)

        if (existingUserName) {
            return res.status(400).json({
                message: "Nombre de usuario ya registrado",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await createUser({
            username,
            name,
            email,
            password: hashedPassword
        })

        /* 
        // Generar token de verificación (COMENTADO - Activación inmediata activa)
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

        // Guardar token en base de datos
        await pool.query(
            'INSERT INTO user_tokens(user_id, token_hash, type, expires_at) VALUES (?, ?, ?, ?)',
            [user.id, verificationToken, 'email_verification', expiresAt]
        )

        // Enviar correo de verificación (de forma asíncrona, sin bloquear la respuesta)
        sendVerificationEmail(email, name, verificationToken).catch(mailError => {
            console.error('Error al enviar correo de verificación:', mailError)
        })
        */

        res.status(201).json({
            message: 'Usuario registrado correctamente. Ya puedes iniciar sesión.',
            // message: 'Usuario registrado correctamente. Por favor, verifica tu correo electrónico para activar tu cuenta.', // Reactivar si se habilita la verificación
            user
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al registrar usuario",
        });
    }
}

export const editProfile = async (req, res, next) => {
    try {
        const identifier = req.params.username
        const requesterId = req.user.id
        const { username, name, description, currentPassword, newPassword, confirmPassword } = req.body
        const file = req.file

        if (!identifier) {
            if (file) fs.unlinkSync(file.path)
            return res.status(400).json({ message: 'Identificador requerido' })
        }

        let targetUser;
        if (!isNaN(identifier)) {
            targetUser = await findUserById(Number(identifier));
        } else {
            targetUser = await findUserByUsername(identifier);
        }

        if (!targetUser) {
            if (file) fs.unlinkSync(file.path)
            return res.status(404).json({ message: 'Usuario no encontrado' })
        }

        // Solo el propietario puede editar su perfil
        if (Number(targetUser.id) !== Number(requesterId)) {
            return res.status(403).json({ message: 'No autorizado para editar este perfil' })
        }

        // Si se quiere cambiar el username, verificar que no esté vacío y no esté en uso por otro
        if (username !== undefined && username.trim() !== '') {
            if (username !== targetUser.username) {
                // El username no puede contener solo números para evitar colisión con IDs
                if (/^\d+$/.test(username)) {
                    return res.status(400).json({ message: 'El nombre de usuario no puede contener solo números' })
                }
                const usernameInUse = await findUserByUsername(username)
                if (usernameInUse) {
                    return res.status(400).json({ message: 'Nombre de usuario ya registrado' })
                }
            }
        }

        const updateData = {}

        if (currentPassword) {
            if (!newPassword || !confirmPassword) {
                if (file) fs.unlinkSync(file.path)
                return res.status(400).json({ message: 'Debes proporcionar la nueva contraseña y su confirmación' })
            }
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ message: 'Las nuevas contraseñas no coinciden' })
            }

            const { data: dbUser, error: dbError } = await supabase
                .from('users')
                .select('password')
                .eq('id', targetUser.id)
                .single()

            if (dbError || !dbUser) {
                return res.status(500).json({ message: 'Error al verificar la contraseña' })
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.password)
            if (!isPasswordValid) {
                return res.status(400).json({ message: 'La contraseña actual es incorrecta' })
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10)
            updateData.password = hashedNewPassword
        }
        // Solo actualizar username si no está vacío
        if (username !== undefined && username.trim() !== '') updateData.username = username
        // Solo actualizar name si no está vacío
        if (name !== undefined && name.trim() !== '') updateData.name = name
        // La descripción puede estar vacía
        if (description !== undefined) updateData.description = description

        // Manejo del archivo de imagen
        if (file) {
            // Si el usuario tiene una imagen anterior, eliminarla en Supabase
            if (targetUser.user_image) {
                await deleteFile(targetUser.user_image, 'profiles')
            }
            const uploadedFilename = await uploadFile(file, 'profiles')
            updateData.user_image = uploadedFilename
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No hay datos para actualizar' })
        }

        const updated = await updateUser(targetUser.id, updateData)
        if (!updated) {
            return res.status(500).json({ message: 'No se pudo actualizar el perfil' })
        }

        const updatedUser = await findUserById(targetUser.id)
        res.json({
            message: 'Perfil actualizado correctamente',
            user: updatedUser
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error al actualizar perfil' })
    }
}

export const deleteProfileImage = async (req, res, next) => {
    try {
        const identifier = req.params.username;
        const requesterId = req.user.id;

        if (!identifier) {
            return res.status(400).json({ message: 'Identificador requerido' });
        }

        let targetUser;
        if (!isNaN(identifier)) {
            targetUser = await findUserById(Number(identifier));
        } else {
            targetUser = await findUserByUsername(identifier);
        }

        if (!targetUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Solo el propietario puede eliminar su imagen
        if (Number(targetUser.id) !== Number(requesterId)) {
            return res.status(403).json({ message: 'No autorizado para eliminar la imagen de este perfil' });
        }

        // Si el usuario tiene una imagen, eliminarla de Supabase Storage
        if (targetUser.user_image) {
            await deleteFile(targetUser.user_image, 'profiles');
        }

        // Actualizar user_image a NULL en la base de datos
        const updated = await updateUser(targetUser.id, { user_image: null });
        if (!updated) {
            return res.status(500).json({ message: 'No se pudo eliminar la imagen del perfil' });
        }

        const updatedUser = await findUserById(targetUser.id);
        res.json({
            message: 'Imagen de perfil eliminada correctamente',
            user: updatedUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar imagen de perfil' });
    }
};

// Elimina la cuenta del propio usuario (hard delete)
export const deleteMe = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await hardDeleteUser(userId);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        if (
            error.message.includes('único administrador') || 
            error.message.includes('rol de administrador') ||
            error.message.includes('Usuario no encontrado')
        ) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Error al eliminar usuario' });
        }
    }
};

// Superadmin elimina cualquier usuario
export const adminDeleteUser = async (req, res, next) => {
    try {
        const targetId = req.params.id;
        await hardDeleteUser(targetId);
        res.json({ message: 'Usuario eliminado por superadmin' });
    } catch (error) {
        console.error(error);
        if (
            error.message.includes('único administrador') || 
            error.message.includes('rol de administrador') ||
            error.message.includes('Usuario no encontrado')
        ) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Error al eliminar usuario' });
        }
    }
};

// Obtiene el perfil del usuario autenticado actual (mi perfil)
export const getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const formatted = formatUserAvatarUrl(user, req);
        res.json({ ...formatted, isOwner: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener perfil propio' });
    }
};

export const listUsers = async (req, res, next) => {
    try {
        const query = req.query.search || '';
        const users = await searchUsers(query);
        const formatted = users.map(u => formatUserAvatarUrl(u, req));
        res.json({ data: formatted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al buscar usuarios' });
    }
};

export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ message: 'Token de verificación requerido' });
        }

        const now = new Date().toISOString();
        const { data: tokenRows, error: tokenError } = await supabase
            .from('user_tokens')
            .select('*')
            .eq('token_hash', token)
            .eq('type', 'email_verification')
            .gt('expires_at', now);

        if (tokenError) throw tokenError;

        if (!tokenRows || tokenRows.length === 0) {
            return res.status(400).json({ message: 'Token de verificación no válido o expirado' });
        }

        const tokenData = tokenRows[0];

        // Si ya fue usado, verificar si el usuario ya está activo
        if (tokenData.used_at !== null) {
            const { data: userRows, error: userError } = await supabase
                .from('users')
                .select('is_active')
                .eq('id', tokenData.user_id)
                .maybeSingle();

            if (userError) throw userError;
            if (userRows && userRows.is_active) {
                return res.json({ message: 'Cuenta activada y verificada correctamente' });
            }
            return res.status(400).json({ message: 'El token de verificación ya ha sido utilizado' });
        }

        // Marcar token como usado
        const { error: updateTokenError } = await supabase
            .from('user_tokens')
            .update({ used_at: now })
            .eq('id', tokenData.id);

        if (updateTokenError) throw updateTokenError;

        // Activar al usuario y marcar email como verificado
        const { error: updateUserError } = await supabase
            .from('users')
            .update({ is_active: true, email_verified: true })
            .eq('id', tokenData.user_id);

        if (updateUserError) throw updateUserError;

        res.json({ message: 'Cuenta activada y verificada correctamente' });
    } catch (error) {
        console.error('Error en verifyEmail:', error);
        res.status(500).json({ message: 'Error al verificar el correo electrónico' });
    }
};

export const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token requerido' })
        }

        const tokenHash = hashToken(refreshToken)
        const tokenRecord = await findRefreshToken(tokenHash)

        if (!tokenRecord) {
            return res.status(401).json({ message: 'Refresh token inválido o expirado' })
        }

        const user = await findUserById(tokenRecord.user_id)
        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' })
        }

        // RTR (Refresh Token Rotation): Delete old token
        await deleteRefreshToken(tokenHash)

        const newAccessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '2h'
            }
        )

        const newRefreshToken = crypto.randomBytes(64).toString('hex')
        const newRefreshTokenHash = hashToken(newRefreshToken)
        const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days (6 months)

        await createRefreshToken({
            userId: user.id,
            tokenHash: newRefreshTokenHash,
            expiresAt: expiresAt.toISOString()
        })

        const formattedUser = formatUserAvatarUrl(user, req)

        res.json({
            token: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
                id: formattedUser.id,
                name: formattedUser.name,
                username: formattedUser.username,
                email: formattedUser.email,
                role: formattedUser.role,
                profile_image_url: formattedUser.profile_image_url,
                user_image: formattedUser.user_image
            }
        })
    } catch (error) {
        next(error)
    }
}

export const logoutAll = async (req, res, next) => {
    try {
        const userId = req.user.id
        await deleteAllUserRefreshTokens(userId)

        res.json({
            message: 'Sesión cerrada correctamente en todos los dispositivos'
        })
    } catch (error) {
        next(error)
    }
}

export const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body
        if (refreshToken) {
            const tokenHash = hashToken(refreshToken)
            await deleteRefreshToken(tokenHash)
        }

        res.json({
            message: 'Sesión cerrada correctamente'
        })
    } catch (error) {
        next(error)
    }
}
