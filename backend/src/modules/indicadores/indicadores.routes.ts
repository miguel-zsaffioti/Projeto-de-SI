import { Router } from 'express'
import { ErroHttp } from '../../errors/ErroHttp'
import { autenticarAdmin } from '../../middlewares/autenticarAdmin'
import { lerId } from '../../utils/lerId'
import { rotaAsync } from '../../utils/rotaAsync'
import { calcularIndicadoresDaPesquisa, consultarIndicadoresDaPesquisa } from './indicadores.service'

export const indicadoresRouter = Router({ mergeParams: true })

const pesquisaNaoEncontrada = new ErroHttp(404, 'Pesquisa não encontrada', 'PESQUISA_NAO_ENCONTRADA')

indicadoresRouter.use(autenticarAdmin)

indicadoresRouter.get(
  '/',
  rotaAsync(async (req, res) => {
    const pesquisaId = lerId(req.params.pesquisaId, pesquisaNaoEncontrada)
    res.json(await consultarIndicadoresDaPesquisa(pesquisaId))
  }),
)

indicadoresRouter.post(
  '/calcular',
  rotaAsync(async (req, res) => {
    const pesquisaId = lerId(req.params.pesquisaId, pesquisaNaoEncontrada)
    res.status(201).json(await calcularIndicadoresDaPesquisa(pesquisaId, req.administradorId!))
  }),
)
