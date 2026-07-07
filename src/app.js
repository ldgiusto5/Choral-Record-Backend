import express from 'express'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import choirRoutes from './routes/choir.routes.js'
import memberRoutes from './routes/member.routes.js'
import pieceRoutes from './routes/piece.routes.js'
import eventRoutes from './routes/event.routes.js'
import { notFound } from './middlewares/notFound.middleware.js'
import { errorHandler } from './middlewares/error.middleware.js'

const app = express()
const swaggerDocument = YAML.load('./src/docs/openapi.yaml')

const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) 
    : ['http://localhost:5173', 'https://choral-record-frontend.vercel.app'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('CORS bloqueó esta petición'));
        }
    },
    credentials: true
}))

app.use(express.json())

app.use('/uploads', express.static('src/uploads'))
app.use('/assets', express.static('src/assets'))

app.use('/api', authRoutes)
app.use('/api', choirRoutes)
app.use('/api', memberRoutes)
app.use('/api', pieceRoutes)
app.use('/api', eventRoutes)

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use(notFound)
app.use(errorHandler)

export default app