import 'dotenv/config'
import type { SignOptions } from 'jsonwebtoken'

function obrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não definida`)
  }
  return valor
}

export const env = {
  porta: Number(process.env.PORT ?? 3001),
  jwtSecret: obrigatoria('JWT_SECRET'),
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'],
}
