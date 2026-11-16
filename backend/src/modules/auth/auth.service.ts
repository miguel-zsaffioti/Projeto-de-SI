import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Administrador } from '@prisma/client'
import { env } from '../../config/env'
import { ErroHttp } from '../../errors/ErroHttp'
import { prisma } from '../../lib/prisma'
import { DadosLogin } from './auth.schemas'

const HASH_PARA_EMAIL_INEXISTENTE = bcrypt.hashSync('senha-que-nunca-confere', 10)

const credenciaisInvalidas = () =>
  new ErroHttp(401, 'E-mail ou senha inválidos', 'CREDENCIAIS_INVALIDAS')

function apresentarAdministrador(administrador: Administrador) {
  return {
    id: administrador.id.toString(),
    nome: administrador.nome,
    email: administrador.email,
  }
}

export async function autenticar({ email, senha }: DadosLogin) {
  const administrador = await prisma.administrador.findUnique({ where: { email } })

  const senhaConfere = await bcrypt.compare(
    senha,
    administrador?.senhaHash ?? HASH_PARA_EMAIL_INEXISTENTE,
  )

  if (!administrador || !administrador.ativo || !senhaConfere) {
    throw credenciaisInvalidas()
  }

  const token = jwt.sign({}, env.jwtSecret, {
    subject: administrador.id.toString(),
    expiresIn: env.jwtExpiresIn,
  })

  return { token, administrador: apresentarAdministrador(administrador) }
}

export async function buscarAdministradorLogado(administradorId: bigint) {
  const administrador = await prisma.administrador.findUnique({ where: { id: administradorId } })

  if (!administrador || !administrador.ativo) {
    throw new ErroHttp(401, 'Sessão expirada ou inválida. Faça login novamente.', 'NAO_AUTENTICADO')
  }

  return apresentarAdministrador(administrador)
}
