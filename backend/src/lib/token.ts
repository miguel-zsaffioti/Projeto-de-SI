import { createHash, createHmac, randomBytes } from 'crypto'

export function gerarTokenConvite(): string {
  return randomBytes(32).toString('base64url')
}

// Token reproduzível de um convite: HMAC-SHA256(segredo, pesquisa + estabelecimento).
// Um par (pesquisa, estabelecimento) sempre gera o mesmo token, então o link pode ser refeito
// no reenvio (RN08) sem guardar o token no banco: o banco guarda só o hash (RNF03).
// Pesquisas ou estabelecimentos diferentes geram tokens diferentes, e o token não é adivinhável
// sem o segredo. Trocar o segredo invalida os links de pesquisas já criadas.
export function gerarTokenConviteDeterministico(
  pesquisaId: bigint,
  estabelecimentoId: bigint,
  segredo: string,
): string {
  if (!segredo) {
    throw new Error('Segredo dos links não definido')
  }
  return createHmac('sha256', segredo).update(`convite:${pesquisaId}:${estabelecimentoId}`).digest('base64url')
}

export function calcularHashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
