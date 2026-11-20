import express, { Request, Response } from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma'
import { tratarErros } from './middlewares/tratarErros'
import { authRouter } from './modules/auth/auth.routes'
import { formularioRouter } from './modules/formulario/formulario.routes'
import { pesquisasRouter } from './modules/pesquisas/pesquisas.routes'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: String(err) })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/formulario', formularioRouter)
app.use('/api/pesquisas', pesquisasRouter)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ erro: 'Rota não encontrada', codigo: 'ROTA_NAO_ENCONTRADA' })
})

app.use(tratarErros)
