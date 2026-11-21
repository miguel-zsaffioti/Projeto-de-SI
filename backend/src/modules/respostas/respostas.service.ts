import { Prisma } from '@prisma/client'
import { ErroHttp } from '../../errors/ErroHttp'
import { prisma } from '../../lib/prisma'
import { recalcularSeJaCalculado } from '../indicadores/indicadores.service'
import { Alteracao, CAMPOS, registrarHistorico, textoOuNulo } from './historico'
import { Correcao } from './respostas.schemas'

const respostaComDetalhes = Prisma.validator<Prisma.RespostaPesquisaDefaultArgs>()({
  include: {
    convite: { include: { estabelecimento: true } },
    ocupacoes: {
      include: { pesquisaPeriodo: { include: { periodo: true } } },
      orderBy: { pesquisaPeriodo: { ordemExibicao: 'asc' } },
    },
  },
})

type RespostaComDetalhes = Prisma.RespostaPesquisaGetPayload<typeof respostaComDetalhes>

const NOMES_DOS_CAMPOS: Record<string, string> = Object.fromEntries(
  Object.entries(CAMPOS).map(([nomeNaApi, colunaNoBanco]) => [colunaNoBanco, nomeNaApi]),
)

async function buscarResposta(respostaId: bigint): Promise<RespostaComDetalhes> {
  const resposta = await prisma.respostaPesquisa.findUnique({ where: { id: respostaId }, ...respostaComDetalhes })

  if (!resposta) {
    throw new ErroHttp(404, 'Resposta não encontrada', 'RESPOSTA_NAO_ENCONTRADA')
  }

  return resposta
}

function apresentarResposta(resposta: RespostaComDetalhes) {
  const { estabelecimento } = resposta.convite

  return {
    id: resposta.id.toString(),
    pesquisaId: resposta.pesquisaId.toString(),
    estabelecimento: {
      id: estabelecimento.id.toString(),
      nomeFantasia: estabelecimento.nomeFantasia,
      tipoHospedagem: estabelecimento.tipoHospedagem,
    },
    enviadaEm: resposta.enviadaEm,
    atualizadaEm: resposta.atualizadaEm,
    preferenciaBoletim: resposta.preferenciaBoletim,
    emailConfirmacao: resposta.emailConfirmacao,
    ocupacoes: resposta.ocupacoes.map((ocupacao) => ({
      periodoId: ocupacao.periodoId.toString(),
      periodo: ocupacao.pesquisaPeriodo.periodo.nome,
      taxaOcupacao: ocupacao.taxaOcupacao?.toNumber() ?? null,
    })),
  }
}

function identificarAlteracao(resposta: RespostaComDetalhes, correcao: Correcao): Alteracao | null {
  let valorAnterior: string | number | null
  let periodoId: bigint | undefined

  if (correcao.campo === 'taxaOcupacao') {
    const ocupacao = resposta.ocupacoes.find((item) => item.periodoId.toString() === correcao.periodoId)
    if (!ocupacao) {
      throw new ErroHttp(400, 'Dados inválidos', 'DADOS_INVALIDOS', [
        { campo: 'periodoId', mensagem: 'Período não pertence a esta resposta' },
      ])
    }
    periodoId = ocupacao.periodoId
    valorAnterior = ocupacao.taxaOcupacao?.toNumber() ?? null
  } else {
    valorAnterior = resposta[correcao.campo]
  }

  if (valorAnterior === correcao.valor) {
    return null
  }

  return {
    periodoId,
    campoAlterado: CAMPOS[correcao.campo],
    valorAnterior: textoOuNulo(valorAnterior),
    valorNovo: textoOuNulo(correcao.valor),
  }
}

async function aplicarCorrecao(tx: Prisma.TransactionClient, respostaId: bigint, correcao: Correcao) {
  if (correcao.campo === 'taxaOcupacao') {
    await tx.respostaOcupacao.update({
      where: { respostaId_periodoId: { respostaId, periodoId: BigInt(correcao.periodoId) } },
      data: { taxaOcupacao: correcao.valor },
    })
    await tx.respostaPesquisa.update({ where: { id: respostaId }, data: { atualizadaEm: new Date() } })
    return
  }

  await tx.respostaPesquisa.update({
    where: { id: respostaId },
    data: { [correcao.campo]: correcao.valor, atualizadaEm: new Date() },
  })
}

async function recalcularIndicadores(pesquisaId: bigint, administradorId: bigint) {
  try {
    return { indicadoresRecalculados: await recalcularSeJaCalculado(pesquisaId, administradorId), aviso: null }
  } catch (erro) {
    if (!(erro instanceof ErroHttp)) {
      throw erro
    }
    return { indicadoresRecalculados: false, aviso: `Correção salva, mas os indicadores não foram recalculados: ${erro.message}` }
  }
}

export async function consultarResposta(respostaId: bigint) {
  return apresentarResposta(await buscarResposta(respostaId))
}

export async function corrigirCampo(respostaId: bigint, correcao: Correcao, administradorId: bigint) {
  const resposta = await buscarResposta(respostaId)
  const alteracao = identificarAlteracao(resposta, correcao)

  if (!alteracao) {
    return { alterado: false, indicadoresRecalculados: false, aviso: null, resposta: apresentarResposta(resposta) }
  }

  await prisma.$transaction(async (tx) => {
    await aplicarCorrecao(tx, resposta.id, correcao)
    await registrarHistorico(tx, resposta.id, [alteracao], { tipo: 'ADMINISTRADOR', administradorId })
  })

  const recalculo =
    correcao.campo === 'taxaOcupacao'
      ? await recalcularIndicadores(resposta.pesquisaId, administradorId)
      : { indicadoresRecalculados: false, aviso: null }

  return { alterado: true, ...recalculo, resposta: apresentarResposta(await buscarResposta(respostaId)) }
}

export async function listarHistorico(respostaId: bigint) {
  const resposta = await buscarResposta(respostaId)
  const nomesDosPeriodos = new Map(
    resposta.ocupacoes.map((ocupacao) => [ocupacao.periodoId.toString(), ocupacao.pesquisaPeriodo.periodo.nome]),
  )

  const historico = await prisma.historicoResposta.findMany({
    where: { respostaId },
    include: { administrador: { select: { id: true, nome: true } } },
    orderBy: [{ alteradoEm: 'desc' }, { id: 'desc' }],
  })

  return historico.map((item) => ({
    id: item.id.toString(),
    campo: NOMES_DOS_CAMPOS[item.campoAlterado] ?? item.campoAlterado,
    periodo: item.periodoId
      ? { id: item.periodoId.toString(), nome: nomesDosPeriodos.get(item.periodoId.toString()) ?? null }
      : null,
    valorAnterior: item.valorAnterior,
    valorNovo: item.valorNovo,
    autor: item.tipoAutor,
    administrador: item.administrador ? { id: item.administrador.id.toString(), nome: item.administrador.nome } : null,
    alteradoEm: item.alteradoEm,
  }))
}
