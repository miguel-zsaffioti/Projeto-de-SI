import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { ErroHttp } from '../errors/ErroHttp'

export function tratarErros(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof ErroHttp) {
    return res.status(erro.status).json({ erro: erro.message, codigo: erro.codigo, campos: erro.campos })
  }

  if (erro instanceof ZodError) {
    const campos = erro.issues.map((issue) => ({ campo: issue.path.join('.'), mensagem: issue.message }))
    return res.status(400).json({ erro: 'Dados inválidos', codigo: 'DADOS_INVALIDOS', campos })
  }

  if (erro instanceof SyntaxError && 'body' in erro) {
    return res.status(400).json({ erro: 'JSON inválido', codigo: 'JSON_INVALIDO' })
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
    return res.status(409).json({ erro: 'Registro duplicado', codigo: 'REGISTRO_DUPLICADO' })
  }

  console.error(erro)
  return res.status(500).json({ erro: 'Erro interno do servidor', codigo: 'ERRO_INTERNO' })
}
