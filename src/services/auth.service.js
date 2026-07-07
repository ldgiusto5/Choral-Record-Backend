import { supabase } from '../database/connection.js'

export const createUser = async ({ username, name, email, password }) => {
    // Note: accounts are immediately set to active and verified
    const { data, error } = await supabase
        .from('users')
        .insert([
            {
                username,
                name,
                email,
                password,
                is_active: true,
                email_verified: true
            }
        ])
        .select()
        .single()

    if (error) {
        console.error('Error in createUser:', error)
        throw error
    }
    return data
}

export const findUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle()

    if (error) {
        console.error('Error in findUserByEmail:', error)
        throw error
    }
    return data
}

export const findUserByUsername = async (username) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle()

    if (error) {
        console.error('Error in findUserByUsername:', error)
        throw error
    }
    return data
}

export const findUserById = async (id) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, username, name, email, role, description, user_image, created_at')
        .eq('id', id)
        .maybeSingle()

    if (error) {
        console.error('Error in findUserById:', error)
        throw error
    }
    return data
}

export const updateUser = async (id, data) => {
    const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', id)

    if (error) {
        console.error('Error in updateUser:', error)
        throw error
    }
    return true
}

export const searchUsers = async (query = '') => {
    const { data, error } = await supabase
        .from('users')
        .select('id, username, name, email, role, description, user_image, created_at')
        .or(`username.ilike.%${query}%,name.ilike.%${query}%`)

    if (error) {
        console.error('Error in searchUsers:', error)
        throw error
    }
    return data
}