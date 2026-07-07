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

app.use(cors({
    origin: process.env.FRONTEND_URL
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