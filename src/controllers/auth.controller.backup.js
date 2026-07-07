import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import fs from 'fs'
import path from 'path'
import { findUserByEmail,
    createUser,
    findUserByUsername,
    findUserById,
    updateUser
  } from '../services/auth.service.js'
import { hardDeleteUser } from '../services/user.service.js'

const formatUserAvatarUrl = (user, req) => {
  if (!user) return null

  const formatted = { ...user }

  const baseUrl = `${req.protocol}://${req.get('host')}`

  formatted.profile_image_url = formatted.user_image
      ? `${baseUrl}/uploads/profiles/${formatted.user_image}`
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

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
    )

    res.json({
        message: 'Login correcto',
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    })
  } catch (error) {
  console.error(error);

  res.status(500).json({
    message: "Error al registrar usuario",
  });
}
}

export const profile = async (req, res) => {
  try {
      const targetUsername = req.params.username

      if (!targetUsername) {
          return res.status(400).json({ message: 'Username requerido' })
      }

      const user = await findUserByUsername(targetUsername)

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

      res.status(201).json({
          message: 'Usuario registrado correctamente',
          user
      })
  } catch (error) {
  console.error(error);

  res.status(500).json({
    message: "Error al obtener producto",
  });
}
}

export const editProfile = async (req, res, next) => {
  try {
      const targetUsername = req.params.username
      const requesterId = req.user.id
      const { username, name, description } = req.body
      const file = req.file

      if (!targetUsername) {
          if (file) fs.unlinkSync(file.path)
          return res.status(400).json({ message: 'Username requerido' })
      }

      const targetUser = await findUserByUsername(targetUsername)
      if (!targetUser) {
          if (file) fs.unlinkSync(file.path)
          return res.status(404).json({ message: 'Usuario no encontrado' })
      }

      // Solo el propietario puede editar su perfil
      if (Number(targetUser.id) !== Number(requesterId)) {
          if (file) fs.unlinkSync(file.path)
          return res.status(403).json({ message: 'No autorizado para editar este perfil' })
      }

      // Si se quiere cambiar el username, verificar que no esté vacío y no esté en uso por otro
      if (username !== undefined && username.trim() !== '') {
          if (username !== targetUser.username) {
              const usernameInUse = await findUserByUsername(username)
              if (usernameInUse) {
                  if (file) fs.unlinkSync(file.path)
                  return res.status(400).json({ message: 'Nombre de usuario ya registrado' })
              }
          }
      }

      const updateData = {}
      // Solo actualizar username si no está vacío
      if (username !== undefined && username.trim() !== '') updateData.username = username
      // Solo actualizar name si no está vacío
      if (name !== undefined && name.trim() !== '') updateData.name = name
      // La descripción puede estar vacía
      if (description !== undefined) updateData.description = description

      // Manejo del archivo de imagen
      if (file) {
          // Si el usuario tiene una imagen anterior, eliminarla
          if (targetUser.user_image) {
              const oldImagePath = path.join('src/uploads/profiles', targetUser.user_image)
              try {
                  if (fs.existsSync(oldImagePath)) {
                      fs.unlinkSync(oldImagePath)
                  }
              } catch (err) {
                  console.error(`Error borrando imagen anterior: ${oldImagePath}`, err)
              }
          }
          updateData.user_image = file.filename
      }

      if (Object.keys(updateData).length === 0) {
          if (file) fs.unlinkSync(file.path)
          return res.status(400).json({ message: 'No hay datos para actualizar' })
      }

      const updated = await updateUser(targetUser.id, updateData)
      if (!updated) {
          if (file) fs.unlinkSync(file.path)
          return res.status(500).json({ message: 'No se pudo actualizar el perfil' })
      }

      const updatedUser = await findUserById(targetUser.id)
      res.json({
          message: 'Perfil actualizado correctamente',
          user: updatedUser
      })
  } catch (error) {
      if (req.file) {
          try {
              fs.unlinkSync(req.file.path)
          } catch (err) {
              console.error('Error limpiando archivo en caso de error:', err)
          }
      }
      console.error(error)
      res.status(500).json({ message: 'Error al actualizar perfil' })
  }
}

export const deleteProfileImage = async (req, res, next) => {
  try {
      const targetUsername = req.params.username;
      const requesterId = req.user.id;

      if (!targetUsername) {
          return res.status(400).json({ message: 'Username requerido' });
      }

      const targetUser = await findUserByUsername(targetUsername);
      if (!targetUser) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Solo el propietario puede eliminar su imagen
      if (Number(targetUser.id) !== Number(requesterId)) {
          return res.status(403).json({ message: 'No autorizado para eliminar la imagen de este perfil' });
      }

      // Si el usuario tiene una imagen, eliminarla del sistema de archivos
      if (targetUser.user_image) {
          const imagePath = path.join('src/uploads/profiles', targetUser.user_image);
          try {
              if (fs.existsSync(imagePath)) {
                  fs.unlinkSync(imagePath);
              }
          } catch (err) {
              console.error(`Error borrando imagen: ${imagePath}`, err);
          }
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
      if (error.message.includes('único administrador')) {
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
      if (error.message.includes('único administrador')) {
          res.status(400).json({ message: error.message });
      } else {
          res.status(500).json({ message: 'Error al eliminar usuario' });
      }
  }
};
