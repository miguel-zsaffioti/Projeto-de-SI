import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { ErroHttp } from '../errors/ErroHttp'

export function autenticarAdmin(req: Request, _res: Response, next: NextFunction) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ')

  if (tipo !== 'Bearer' || !token) {
    return next(new ErroHttp(401, 'Sessão não encontrada. Faça login.', 'NAO_AUTENTICADO'))
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    if (typeof payload === 'string' || !payload.sub) {
      throw new Error('Token sem identificação do administrador')
    }
    req.administradorId = BigInt(payload.sub)
    next()
  } catch {
    next(new ErroHttp(401, 'Sessão expirada ou inválida. Faça login novamente.', 'NAO_AUTENTICADO'))
  }
}
