import { ErroHttp } from '../errors/ErroHttp'

export function lerId(valor: string, naoEncontrado: ErroHttp): bigint {
  if (!/^\d{1,18}$/.test(valor)) {
    throw naoEncontrado
  }
  return BigInt(valor)
}
