import { Router } from 'express'
import { ErroHttp } from '../../errors/ErroHttp'
import { autenticarAdmin } from '../../middlewares/autenticarAdmin'
import { lerId } from '../../utils/lerId'
import { rotaAsync } from '../../utils/rotaAsync'
import { calcularIndicadoresDaPesquisa, consultarIndicadoresDaPesquisa } from './indicadores.service'
import { exportarIndicadoresCsv } from './exportacao.service'

export const indicadoresRouter = Router({ mergeParams: true })

const pesquisaNaoEncontrada = new ErroHttp(404, 'Pesquisa não encontrada', 'PESQUISA_NAO_ENCONTRADA')

indicadoresRouter.use(autenticarAdmin)

indicadoresRouter.get(
  '/exportar.csv',
  rotaAsync(async (req, res) => {
    const pesquisaId = lerId(req.params.pesquisaId, pesquisaNaoEncontrada)
    const valor = typeof req.query.periodoIds === 'string' ? req.query.periodoIds : undefined
    const periodoIds = valor
      ? valor.split(',').map((id) => lerId(id, new ErroHttp(400, 'Período inválido', 'PERIODO_INVALIDO')))
      : undefined
    const csv = await exportarIndicadoresCsv(pesquisaId, { periodoIds })

    res
      .status(200)
      .type('text/csv')
      .setHeader('Content-Disposition', `attachment; filename="indicadores-pesquisa-${pesquisaId}.csv"`)
      .send(csv)
  }),
)

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
