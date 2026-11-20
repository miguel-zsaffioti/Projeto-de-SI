import { Pesquisa } from '@prisma/client'
import { env } from '../../config/env'
import { ErroHttp } from '../../errors/ErroHttp'
import { prisma } from '../../lib/prisma'
import { calcularPrazoPadrao } from '../../lib/prazo'
import { calcularHashToken, gerarTokenConviteDeterministico } from '../../lib/token'
import { DadosCriarPesquisa } from './pesquisas.schemas'

function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10)
}

function montarLink(token: string): string {
  return `${env.baseUrl}/responder/${token}`
}

function apresentarPesquisa(pesquisa: Pesquisa) {
  return {
    id: pesquisa.id.toString(),
    tipo: pesquisa.tipo,
    status: pesquisa.status,
    abertaEm: pesquisa.abertaEm,
    prazoResposta: pesquisa.prazoResposta,
  }
}

export function sugerirPrazo() {
  const { data, prazo } = calcularPrazoPadrao()
  return { data, prazoResposta: prazo }
}

export async function criarPesquisa(administradorId: bigint, dados: DadosCriarPesquisa) {
  const estabelecimentos = await prisma.estabelecimento.findMany({
    where: { ativo: true },
    orderBy: { codigoInterno: 'asc' },
    select: { id: true, codigoInterno: true, nomeFantasia: true },
  })

  if (estabelecimentos.length === 0) {
    throw new ErroHttp(
      422,
      'Não há meios de hospedagem ativos no inventário para receber a pesquisa.',
      'INVENTARIO_VAZIO',
    )
  }

  const abertura = new Date()
  const prazoResposta = dados.prazoResposta ?? calcularPrazoPadrao(abertura).prazo

  const { pesquisa, periodos, convites, tokens } = await prisma.$transaction(async (tx) => {
    const periodos = []

    for (const [indice, dadosPeriodo] of dados.periodos.entries()) {
      const chave = {
        nome: dadosPeriodo.nome,
        dataInicio: new Date(dadosPeriodo.dataInicio),
        dataFim: new Date(dadosPeriodo.dataFim),
        tipoDado: dadosPeriodo.tipoDado,
      }

      const periodo = await tx.periodoReferencia.upsert({
        where: { uq_periodo_referencia: chave },
        update: {},
        create: chave,
      })

      periodos.push({ periodo, ordemExibicao: indice + 1 })
    }

    const pesquisa = await tx.pesquisa.create({
      data: {
        tipo: dados.tipo,
        criadaPor: administradorId,
        abertaEm: abertura,
        prazoResposta,
        periodos: {
          create: periodos.map(({ periodo, ordemExibicao }) => ({ periodoId: periodo.id, ordemExibicao })),
        },
      },
    })

    // O token depende do id da pesquisa; o banco guarda apenas o hash (RNF03).
    const tokens = estabelecimentos.map((estabelecimento) => {
      const token = gerarTokenConviteDeterministico(pesquisa.id, estabelecimento.id, env.linkTokenSecret)
      return { estabelecimento, token, tokenHash: calcularHashToken(token) }
    })

    await tx.convitePesquisa.createMany({
      data: tokens.map(({ estabelecimento, tokenHash }) => ({
        pesquisaId: pesquisa.id,
        estabelecimentoId: estabelecimento.id,
        tokenHash,
      })),
    })

    const convites = await tx.convitePesquisa.findMany({
      where: { pesquisaId: pesquisa.id },
      select: { id: true, estabelecimentoId: true, status: true },
    })

    return { pesquisa, periodos, convites, tokens }
  })

  return {
    pesquisa: {
      ...apresentarPesquisa(pesquisa),
      periodos: periodos.map(({ periodo, ordemExibicao }) => ({
        id: periodo.id.toString(),
        nome: periodo.nome,
        dataInicio: formatarData(periodo.dataInicio),
        dataFim: formatarData(periodo.dataFim),
        tipoDado: periodo.tipoDado,
        ordemExibicao,
      })),
    },
    totalConvites: convites.length,
    convites: tokens.map(({ estabelecimento, token }) => {
      const convite = convites.find(({ estabelecimentoId }) => estabelecimentoId === estabelecimento.id)!
      return {
        id: convite.id.toString(),
        status: convite.status,
        estabelecimento: {
          id: estabelecimento.id.toString(),
          codigoInterno: estabelecimento.codigoInterno,
          nomeFantasia: estabelecimento.nomeFantasia,
        },
        link: montarLink(token),
      }
    }),
  }
}

export async function listarPesquisas() {
  const [pesquisas, respondidos] = await Promise.all([
    prisma.pesquisa.findMany({
      orderBy: { criadaEm: 'desc' },
      include: { _count: { select: { periodos: true, convites: true } } },
    }),
    prisma.convitePesquisa.groupBy({
      by: ['pesquisaId'],
      where: { status: 'RESPONDIDO' },
      _count: { _all: true },
    }),
  ])

  const agora = new Date()

  return pesquisas.map((pesquisa) => ({
    ...apresentarPesquisa(pesquisa),
    encerradaEm: pesquisa.encerradaEm,
    prazoVencido: pesquisa.prazoResposta < agora,
    totalPeriodos: pesquisa._count.periodos,
    totalConvites: pesquisa._count.convites,
    totalRespondidos: respondidos.find(({ pesquisaId }) => pesquisaId === pesquisa.id)?._count._all ?? 0,
  }))
}
