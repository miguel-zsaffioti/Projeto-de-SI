import { Router } from 'express'
import { autenticarAdmin } from '../../middlewares/autenticarAdmin'
import { rotaAsync } from '../../utils/rotaAsync'
import { loginSchema } from './auth.schemas'
import { autenticar, buscarAdministradorLogado } from './auth.service'

export const authRouter = Router()

authRouter.post(
  '/login',
  rotaAsync(async (req, res) => {
    const dados = loginSchema.parse(req.body)
    res.json(await autenticar(dados))
  }),
)

authRouter.get(
  '/me',
  autenticarAdmin,
  rotaAsync(async (req, res) => {
    res.json(await buscarAdministradorLogado(req.administradorId!))
  }),
)
