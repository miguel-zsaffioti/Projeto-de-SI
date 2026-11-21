import { Router } from 'express'
import { ErroHttp } from '../../errors/ErroHttp'
import { autenticarAdmin } from '../../middlewares/autenticarAdmin'
import { lerId } from '../../utils/lerId'
import { rotaAsync } from '../../utils/rotaAsync'
import { correcaoSchema } from './respostas.schemas'
import { consultarResposta, corrigirCampo, listarHistorico } from './respostas.service'

export const respostasRouter = Router()

const respostaNaoEncontrada = new ErroHttp(404, 'Resposta não encontrada', 'RESPOSTA_NAO_ENCONTRADA')

respostasRouter.use(autenticarAdmin)

respostasRouter.get(
  '/:respostaId',
  rotaAsync(async (req, res) => {
    res.json(await consultarResposta(lerId(req.params.respostaId, respostaNaoEncontrada)))
  }),
)

respostasRouter.get(
  '/:respostaId/historico',
  rotaAsync(async (req, res) => {
    res.json(await listarHistorico(lerId(req.params.respostaId, respostaNaoEncontrada)))
  }),
)

respostasRouter.patch(
  '/:respostaId',
  rotaAsync(async (req, res) => {
    const respostaId = lerId(req.params.respostaId, respostaNaoEncontrada)
    const correcao = correcaoSchema.parse(req.body)
    const resultado = await corrigirCampo(respostaId, correcao, req.administradorId!)

    res.json({
      mensagem: resultado.alterado ? 'Campo corrigido com sucesso' : 'Nenhuma alteração: o valor já era esse',
      ...resultado,
    })
  }),
)
