import 'dotenv/config'
import app from './app.js'
import { supabase } from './database/connection.js'
import { initializeDatabase } from './database/dbInit.js'

const PORT = process.env.PORT || 3000

const testConnection = async () => {
    try {
        const { data, error } = await supabase.from('users').select('id').limit(1)
        if (error) {
            console.error('Error al conectar con Supabase:', error.message)
        } else {
            console.log('Conexión Supabase correcta.')
        }
    } catch (err) {
        console.error('Error de red al conectar con Supabase:', err.message)
    }
    
    // Inicializar tablas de la base de datos si no existen
    await initializeDatabase()
}

testConnection()

app.listen(PORT, () => {
    console.log(`API funcionando en http://localhost:${PORT}`)
})