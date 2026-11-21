import { Prisma, TipoAutorAlteracao } from '@prisma/client'

export const CAMPOS = {
  taxaOcupacao: 'taxa_ocupacao',
  preferenciaBoletim: 'preferencia_boletim',
  emailConfirmacao: 'email_confirmacao',
} as const

export type Alteracao = {
  periodoId?: bigint
  campoAlterado: (typeof CAMPOS)[keyof typeof CAMPOS]
  valorAnterior: string | null
  valorNovo: string | null
}

export type Autor = { tipo: TipoAutorAlteracao; administradorId?: bigint }

export function textoOuNulo(valor: string | number | null | undefined): string | null {
  return valor === null || valor === undefined ? null : String(valor)
}

export async function registrarHistorico(
  tx: Prisma.TransactionClient,
  respostaId: bigint,
  alteracoes: Alteracao[],
  autor: Autor,
) {
  await tx.historicoResposta.createMany({
    data: alteracoes.map((alteracao) => ({
      ...alteracao,
      respostaId,
      tipoAutor: autor.tipo,
      administradorId: autor.administradorId,
    })),
  })
}
