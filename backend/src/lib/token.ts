import { createHash, randomBytes } from 'crypto'

export function gerarTokenConvite(): string {
  return randomBytes(32).toString('base64url')
}

export function calcularHashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
