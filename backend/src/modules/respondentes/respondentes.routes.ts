import { Router } from 'express'
import { autenticarAdmin } from '../../middlewares/autenticarAdmin'
import { lerId } from '../../utils/lerId'
import { rotaAsync } from '../../utils/rotaAsync'
import { reenviarSchema } from './respondentes.schemas'
import { listarRespondentes, reenviarLinks } from './respondentes.service'
import { ErroHttp } from '../../errors/ErroHttp'

export const respondentesRouter = Router({ mergeParams: true })
const pesquisaNaoEncontrada = new ErroHttp(404, 'Pesquisa não encontrada', 'PESQUISA_NAO_ENCONTRADA')
respondentesRouter.use(autenticarAdmin)

respondentesRouter.get('/', rotaAsync(async (req, res) => {
  res.json(await listarRespondentes(lerId(req.params.pesquisaId, pesquisaNaoEncontrada)))
}))

respondentesRouter.post('/reenviar', rotaAsync(async (req, res) => {
  const dados = reenviarSchema.parse(req.body)
  res.json(await reenviarLinks(lerId(req.params.pesquisaId, pesquisaNaoEncontrada), req.administradorId!, dados))
}))
