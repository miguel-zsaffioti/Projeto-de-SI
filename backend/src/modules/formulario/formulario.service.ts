import { Prisma } from '@prisma/client'
import { ErroHttp, CampoInvalido } from '../../errors/ErroHttp'
import { prisma } from '../../lib/prisma'
import { calcularHashToken } from '../../lib/token'
import { DadosResposta } from './formulario.schemas'

const conviteComDetalhes = Prisma.validator<Prisma.ConvitePesquisaDefaultArgs>()({
  include: {
    estabelecimento: true,
    pesquisa: {
      include: {
        periodos: { include: { periodo: true }, orderBy: { ordemExibicao: 'asc' } },
      },
    },
    resposta: { include: { ocupacoes: true } },
  },
})

type ConviteComDetalhes = Prisma.ConvitePesquisaGetPayload<typeof conviteComDetalhes>
type RespostaComOcupacoes = NonNullable<ConviteComDetalhes['resposta']>
type Transacao = Prisma.TransactionClient

type RegistroHistorico = {
  periodoId?: bigint
  campoAlterado: string
  valorAnterior: string | null
  valorNovo: string | null
}

async function buscarConvite(token: string): Promise<ConviteComDetalhes> {
  const convite = await prisma.convitePesquisa.findUnique({
    where: { tokenHash: calcularHashToken(token) },
    ...conviteComDetalhes,
  })

  if (!convite) {
    throw new ErroHttp(404, 'Link inválido. Confira se o endereço está completo.', 'LINK_INVALIDO')
  }

  return convite
}

function garantirPesquisaAberta(convite: ConviteComDetalhes) {
  const { status, prazoResposta } = convite.pesquisa

  if (status !== 'ABERTA' || prazoResposta < new Date()) {
    throw new ErroHttp(
      410,
      'O prazo desta pesquisa terminou. Para corrigir sua resposta, entre em contato com o OTO.',
      'PESQUISA_ENCERRADA',
    )
  }
}

function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10)
}

function apresentarResposta(resposta: RespostaComOcupacoes) {
  return {
    enviadaEm: resposta.enviadaEm,
    atualizadaEm: resposta.atualizadaEm,
    preferenciaBoletim: resposta.preferenciaBoletim,
    emailConfirmacao: resposta.emailConfirmacao,
    ocupacoes: resposta.ocupacoes.map((ocupacao) => ({
      periodoId: ocupacao.periodoId.toString(),
      taxaOcupacao: ocupacao.taxaOcupacao?.toNumber() ?? null,
    })),
  }
}

function apresentarFormulario(convite: ConviteComDetalhes) {
  return {
    estabelecimento: { nomeFantasia: convite.estabelecimento.nomeFantasia },
    pesquisa: {
      tipo: convite.pesquisa.tipo,
      prazoResposta: convite.pesquisa.prazoResposta,
    },
    periodos: convite.pesquisa.periodos.map(({ periodo }) => ({
      id: periodo.id.toString(),
      nome: periodo.nome,
      dataInicio: formatarData(periodo.dataInicio),
      dataFim: formatarData(periodo.dataFim),
      tipoDado: periodo.tipoDado,
    })),
    resposta: convite.resposta ? apresentarResposta(convite.resposta) : null,
  }
}

function validarPeriodosInformados(convite: ConviteComDetalhes, dados: DadosResposta) {
  const periodosDaPesquisa = convite.pesquisa.periodos.map(({ periodoId }) => periodoId.toString())
  const periodosInformados = dados.ocupacoes.map(({ periodoId }) => periodoId)
  const erros: CampoInvalido[] = []

  periodosDaPesquisa.forEach((periodoId) => {
    const quantidade = periodosInformados.filter((informado) => informado === periodoId).length
    if (quantidade === 0) {
      erros.push({ campo: `periodo.${periodoId}`, mensagem: 'Informe a taxa de ocupação deste período' })
    }
    if (quantidade > 1) {
      erros.push({ campo: `periodo.${periodoId}`, mensagem: 'Período informado mais de uma vez' })
    }
  })

  periodosInformados
    .filter((periodoId) => !periodosDaPesquisa.includes(periodoId))
    .forEach((periodoId) => {
      erros.push({ campo: `periodo.${periodoId}`, mensagem: 'Período não pertence a esta pesquisa' })
    })

  if (erros.length > 0) {
    throw new ErroHttp(400, 'Dados inválidos', 'DADOS_INVALIDOS', erros)
  }
}

async function registrarNovaResposta(tx: Transacao, convite: ConviteComDetalhes, dados: DadosResposta) {
  await tx.respostaPesquisa.create({
    data: {
      pesquisaId: convite.pesquisaId,
      estabelecimentoId: convite.estabelecimentoId,
      conviteId: convite.id,
      preferenciaBoletim: dados.preferenciaBoletim,
      emailConfirmacao: dados.emailConfirmacao,
      ocupacoes: {
        createMany: {
          data: dados.ocupacoes.map((ocupacao) => ({
            pesquisaId: convite.pesquisaId,
            periodoId: BigInt(ocupacao.periodoId),
            taxaOcupacao: ocupacao.taxaOcupacao,
          })),
        },
      },
    },
  })

  await tx.convitePesquisa.update({
    where: { id: convite.id },
    data: { status: 'RESPONDIDO' },
  })
}

function textoOuNulo(valor: string | number | null | undefined): string | null {
  return valor === null || valor === undefined ? null : String(valor)
}

function compararCamposDaResposta(anterior: RespostaComOcupacoes, dados: DadosResposta): RegistroHistorico[] {
  const alteracoes: RegistroHistorico[] = []

  if (anterior.preferenciaBoletim !== dados.preferenciaBoletim) {
    alteracoes.push({
      campoAlterado: 'preferencia_boletim',
      valorAnterior: anterior.preferenciaBoletim,
      valorNovo: dados.preferenciaBoletim,
    })
  }

  if (anterior.emailConfirmacao !== dados.emailConfirmacao) {
    alteracoes.push({
      campoAlterado: 'email_confirmacao',
      valorAnterior: anterior.emailConfirmacao,
      valorNovo: dados.emailConfirmacao,
    })
  }

  for (const ocupacao of dados.ocupacoes) {
    const taxaAnterior = anterior.ocupacoes
      .find(({ periodoId }) => periodoId.toString() === ocupacao.periodoId)
      ?.taxaOcupacao?.toNumber()

    if (taxaAnterior !== ocupacao.taxaOcupacao) {
      alteracoes.push({
        periodoId: BigInt(ocupacao.periodoId),
        campoAlterado: 'taxa_ocupacao',
        valorAnterior: textoOuNulo(taxaAnterior),
        valorNovo: textoOuNulo(ocupacao.taxaOcupacao),
      })
    }
  }

  return alteracoes
}

async function retificarResposta(tx: Transacao, convite: ConviteComDetalhes, dados: DadosResposta) {
  const anterior = convite.resposta!
  const alteracoes = compararCamposDaResposta(anterior, dados)

  for (const ocupacao of dados.ocupacoes) {
    const periodoId = BigInt(ocupacao.periodoId)
    await tx.respostaOcupacao.upsert({
      where: { respostaId_periodoId: { respostaId: anterior.id, periodoId } },
      update: { taxaOcupacao: ocupacao.taxaOcupacao },
      create: {
        respostaId: anterior.id,
        pesquisaId: convite.pesquisaId,
        periodoId,
        taxaOcupacao: ocupacao.taxaOcupacao,
      },
    })
  }

  await tx.respostaPesquisa.update({
    where: { id: anterior.id },
    data: {
      preferenciaBoletim: dados.preferenciaBoletim,
      emailConfirmacao: dados.emailConfirmacao,
      atualizadaEm: new Date(),
    },
  })

  await tx.historicoResposta.createMany({
    data: alteracoes.map((alteracao) => ({
      ...alteracao,
      respostaId: anterior.id,
      tipoAutor: 'ESTABELECIMENTO' as const,
    })),
  })

  return alteracoes.length
}

export async function abrirFormulario(token: string) {
  const convite = await buscarConvite(token)
  garantirPesquisaAberta(convite)
  return apresentarFormulario(convite)
}

export async function enviarResposta(token: string, dados: DadosResposta) {
  const convite = await buscarConvite(token)
  garantirPesquisaAberta(convite)
  validarPeriodosInformados(convite, dados)

  const ehRetificacao = convite.resposta !== null

  const camposAlterados = await prisma.$transaction(async (tx) => {
    if (ehRetificacao) {
      return retificarResposta(tx, convite, dados)
    }
    await registrarNovaResposta(tx, convite, dados)
    return 0
  })

  const conviteAtualizado = await buscarConvite(token)

  return {
    retificada: ehRetificacao,
    camposAlterados,
    resposta: apresentarResposta(conviteAtualizado.resposta!),
  }
}
