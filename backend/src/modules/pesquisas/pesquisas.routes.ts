import { Router } from 'express'
import { autenticarAdmin } from '../../middlewares/autenticarAdmin'
import { rotaAsync } from '../../utils/rotaAsync'
import { criarPesquisaSchema } from './pesquisas.schemas'
import { criarPesquisa, listarPesquisas, sugerirPrazo } from './pesquisas.service'

export const pesquisasRouter = Router()

pesquisasRouter.use(autenticarAdmin)

pesquisasRouter.get('/prazo-sugerido', (_req, res) => {
  res.json(sugerirPrazo())
})

pesquisasRouter.get(
  '/',
  rotaAsync(async (_req, res) => {
    res.json(await listarPesquisas())
  }),
)

pesquisasRouter.post(
  '/',
  rotaAsync(async (req, res) => {
    const dados = criarPesquisaSchema.parse(req.body)
    res.status(201).json(await criarPesquisa(req.administradorId!, dados))
  }),
)
