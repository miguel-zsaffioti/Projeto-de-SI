import { Router } from 'express'
import { rotaAsync } from '../../utils/rotaAsync'
import { respostaSchema } from './formulario.schemas'
import { abrirFormulario, enviarResposta } from './formulario.service'

export const formularioRouter = Router()

formularioRouter.get(
  '/:token',
  rotaAsync(async (req, res) => {
    res.json(await abrirFormulario(req.params.token))
  }),
)

formularioRouter.post(
  '/:token/resposta',
  rotaAsync(async (req, res) => {
    const dados = respostaSchema.parse(req.body)
    const resultado = await enviarResposta(req.params.token, dados)

    res.status(resultado.retificada ? 200 : 201).json({
      mensagem: resultado.retificada ? 'Resposta atualizada com sucesso' : 'Resposta enviada com sucesso',
      ...resultado,
    })
  }),
)
