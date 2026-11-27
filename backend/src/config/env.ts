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
  // Segredo dos links únicos dos convites. Sem LINK_TOKEN_SECRET, usa o JWT_SECRET.
  linkTokenSecret: process.env.LINK_TOKEN_SECRET || obrigatoria('JWT_SECRET'),
  baseUrl: (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'OTO <noreply@localhost>',
  },
}
