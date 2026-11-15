import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: String(err) })
  }
})

// ── Rotas da API (adicionadas nas próximas entregas) ──────────
// app.use('/api/pesquisas', pesquisasRouter)
// app.use('/api/estabelecimentos', estabelecimentosRouter)

// ── 404 ───────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// ── Error handler ─────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`✅  Backend OTO rodando em http://localhost:${PORT}`)
})

