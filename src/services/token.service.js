import { supabase } from '../database/connection.js'

export const createRefreshToken = async ({ userId, tokenHash, expiresAt }) => {
    const { data, error } = await supabase
        .from('user_tokens')
        .insert([
            {
                user_id: userId,
                token_hash: tokenHash,
                type: 'refresh',
                expires_at: expiresAt
            }
        ])
        .select()
        .single()

    if (error) {
        console.error('Error in createRefreshToken:', error)
        throw error
    }
    return data
}

export const findRefreshToken = async (tokenHash) => {
    const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .eq('type', 'refresh')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

    if (error) {
        console.error('Error in findRefreshToken:', error)
        throw error
    }
    return data
}

export const deleteRefreshToken = async (tokenHash) => {
    const { error } = await supabase
        .from('user_tokens')
        .delete()
        .eq('token_hash', tokenHash)
        .eq('type', 'refresh')

    if (error) {
        console.error('Error in deleteRefreshToken:', error)
        throw error
    }
    return true
}

export const deleteAllUserRefreshTokens = async (userId) => {
    const { error } = await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'refresh')

    if (error) {
        console.error('Error in deleteAllUserRefreshTokens:', error)
        throw error
    }
    return true
}
