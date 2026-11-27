import { Prisma } from '@prisma/client'
import { ErroHttp } from '../../errors/ErroHttp'
import { prisma } from '../../lib/prisma'
import {
  CalculoSemRespondentes,
  DiariaMedia,
  EntradaCalculo,
  MeioHospedagem,
  ResultadoCalculo,
  calcularIndicadores,
  contarDiarias,
} from './calculo'

type LinhaIndicador = {
  codigoIndicador: string
  chaveDimensao: string
  valor: number
  unidade: string
}

const execucaoComIndicadores = Prisma.validator<Prisma.ExecucaoCalculoDefaultArgs>()({
  include: { indicadores: { orderBy: { id: 'asc' } } },
})

type ExecucaoComIndicadores = Prisma.ExecucaoCalculoGetPayload<typeof execucaoComIndicadores>

function converterEmLinhas(resultado: ResultadoCalculo): LinhaIndicador[] {
  const linha = (codigoIndicador: string, valor: number, unidade: string, chaveDimensao = 'TOTAL') => ({
    codigoIndicador,
    chaveDimensao,
    valor,
    unidade,
  })
  const { turistas, cobertura } = resultado

  return [
    linha('TAXA_OCUPACAO_PONDERADA', resultado.taxaOcupacaoPonderada, '%'),
    linha('TURISTAS_RESPONDENTES', turistas.respondentes, 'turistas'),
    linha('TURISTAS_NAO_RESPONDENTES', turistas.naoRespondentes, 'turistas'),
    linha('TURISTAS_MEIOS_REGULARES', turistas.meiosRegulares, 'turistas'),
    linha('TURISTAS_RHC', turistas.rhc, 'turistas'),
    linha('TURISTAS_DAY_USE_POR_DIA', turistas.dayUsePorDia, 'turistas/dia'),
    linha('TURISTAS_DAY_USE', turistas.dayUse, 'turistas'),
    linha('TURISTAS_TOTAL', turistas.total, 'turistas'),
    linha('TURISTAS_POR_DIA', turistas.totalPorDia, 'turistas/dia'),
    linha('COBERTURA_ESTABELECIMENTOS', cobertura.percentualEstabelecimentos, '%'),
    linha('COBERTURA_LEITOS', cobertura.percentualLeitos, '%'),
    linha('ESTABELECIMENTOS_RESPONDENTES', cobertura.estabelecimentosRespondentes, 'estabelecimentos'),
    linha('LEITOS_RESPONDENTES', cobertura.leitosRespondentes, 'leitos'),
    ...Object.entries(resultado.faixasOcupacao).map(([faixa, quantidade]) =>
      linha('ESTABELECIMENTOS_POR_FAIXA', quantidade, 'estabelecimentos', faixa),
    ),
    ...Object.entries(resultado.taxaOcupacaoPorCategoria).map(([categoria, taxa]) =>
      linha('TAXA_OCUPACAO_POR_TIPO', taxa, '%', categoria),
    ),
    ...resultado.revpar.flatMap((item) => [
      linha(`REVPAR_${item.metodo}`, item.revpar, 'R$', item.categoria),
      linha(`RECEITA_ESTIMADA_${item.metodo}`, item.receitaEstimada, 'R$', item.categoria),
    ]),
  ]
}

function descreverPendencias(resultado: ResultadoCalculo): string | null {
  if (resultado.revparPendentes.length === 0) {
    return null
  }
  const pendentes = resultado.revparPendentes.map(({ categoria, metodo }) => `${categoria} (${metodo})`)
  return `RevPAR pendente por falta de diária média: ${pendentes.join(', ')}`
}

async function buscarPesquisa(pesquisaId: bigint) {
  const pesquisa = await prisma.pesquisa.findUnique({
    where: { id: pesquisaId },
    include: { periodos: { include: { periodo: true }, orderBy: { ordemExibicao: 'asc' } } },
  })

  if (!pesquisa) {
    throw new ErroHttp(404, 'Pesquisa não encontrada', 'PESQUISA_NAO_ENCONTRADA')
  }

  return pesquisa
}

async function carregarInventario(): Promise<MeioHospedagem[]> {
  const estabelecimentos = await prisma.estabelecimento.findMany({ where: { ativo: true } })

  const incompletos = estabelecimentos.filter((item) => item.leitosMinPorUh === null || item.leitosMaxPorUh === null)
  if (incompletos.length > 0) {
    throw new ErroHttp(
      422,
      `Inventário incompleto: falta o mínimo/máximo de leitos por UH de ${incompletos.map((item) => item.nomeFantasia).join(', ')}`,
      'INVENTARIO_INCOMPLETO',
    )
  }

  return estabelecimentos.map((item) => ({
    id: item.id.toString(),
    tipo: item.tipoHospedagem,
    totalUh: item.totalUh,
    leitosMinPorUh: item.leitosMinPorUh!.toNumber(),
    leitosMaxPorUh: item.leitosMaxPorUh!.toNumber(),
  }))
}

async function carregarRhc() {
  const rhc = await prisma.inventarioRhc.findFirst({ orderBy: { atualizadoEm: 'desc' } })

  if (!rhc) {
    throw new ErroHttp(422, 'RHC não cadastrado. Rode o seed do banco.', 'RHC_AUSENTE')
  }

  return {
    totalUh: rhc.totalUh,
    leitosMinPorUh: rhc.leitosMinPorUh.toNumber(),
    leitosMaxPorUh: rhc.leitosMaxPorUh.toNumber(),
  }
}

async function carregarParametrosAtivos() {
  const conjunto = await prisma.conjuntoParametrosCalculo.findFirst({
    where: { ativo: true },
    include: { parametrosDiaria: true },
    orderBy: { criadoEm: 'desc' },
  })

  if (!conjunto) {
    throw new ErroHttp(422, 'Nenhum conjunto de parâmetros de cálculo ativo.', 'PARAMETROS_AUSENTES')
  }

  const diariasMedias: DiariaMedia[] = conjunto.parametrosDiaria.map((item) => ({
    categoria: item.categoria,
    metodo: item.metodo,
    valor: item.valorDiariaMedia.toNumber(),
  }))

  return { id: conjunto.id, percentualDayUse: conjunto.percentualDayUse.toNumber(), diariasMedias }
}

async function carregarTaxasInformadas(pesquisaId: bigint) {
  const ocupacoes = await prisma.respostaOcupacao.findMany({
    where: { pesquisaId, taxaOcupacao: { not: null } },
    include: { resposta: { select: { estabelecimentoId: true } } },
  })

  return ocupacoes.map((ocupacao) => ({
    periodoId: ocupacao.periodoId,
    estabelecimentoId: ocupacao.resposta.estabelecimentoId.toString(),
    taxaOcupacao: ocupacao.taxaOcupacao!.toNumber(),
  }))
}

function apresentarExecucao(execucao: ExecucaoComIndicadores | null) {
  if (!execucao) {
    return { execucaoId: null, status: null, calculadoEm: null, mensagem: null, indicadores: [] }
  }

  return {
    execucaoId: execucao.id.toString(),
    status: execucao.status,
    calculadoEm: execucao.calculadoEm,
    mensagem: execucao.mensagemErro,
    indicadores: execucao.indicadores.map((indicador) => ({
      codigo: indicador.codigoIndicador,
      dimensao: indicador.chaveDimensao,
      valor: indicador.valor.toNumber(),
      unidade: indicador.unidade,
    })),
  }
}

function apresentarPeriodo(periodo: { id: bigint; nome: string; dataInicio: Date; dataFim: Date; tipoDado: string }) {
  return {
    id: periodo.id.toString(),
    nome: periodo.nome,
    dataInicio: periodo.dataInicio.toISOString().slice(0, 10),
    dataFim: periodo.dataFim.toISOString().slice(0, 10),
    tipoDado: periodo.tipoDado,
    diarias: contarDiarias(periodo.dataInicio, periodo.dataFim),
  }
}

export async function calcularIndicadoresDaPesquisa(pesquisaId: bigint, administradorId: bigint) {
  const pesquisa = await buscarPesquisa(pesquisaId)
  const [meiosHospedagem, rhc, parametros, taxasInformadas] = await Promise.all([
    carregarInventario(),
    carregarRhc(),
    carregarParametrosAtivos(),
    carregarTaxasInformadas(pesquisaId),
  ])

  if (taxasInformadas.length === 0) {
    throw new ErroHttp(422, 'A pesquisa ainda não tem respostas para calcular os indicadores.', 'SEM_RESPOSTAS')
  }

  const periodos = []

  for (const { periodo } of pesquisa.periodos) {
    const entrada: EntradaCalculo = {
      diarias: contarDiarias(periodo.dataInicio, periodo.dataFim),
      meiosHospedagem,
      rhc,
      percentualDayUse: parametros.percentualDayUse,
      diariasMedias: parametros.diariasMedias,
      respostas: taxasInformadas.filter((taxa) => taxa.periodoId === periodo.id),
    }

    const execucao = await registrarExecucao(pesquisaId, periodo.id, parametros.id, administradorId, entrada)
    periodos.push({ periodo: apresentarPeriodo(periodo), ...apresentarExecucao(execucao) })
  }

  return { pesquisaId: pesquisaId.toString(), periodos }
}

async function registrarExecucao(
  pesquisaId: bigint,
  periodoId: bigint,
  conjuntoParametrosId: bigint,
  executadoPor: bigint,
  entrada: EntradaCalculo,
) {
  const dadosExecucao = { pesquisaId, periodoId, conjuntoParametrosId, executadoPor }

  let resultado: ResultadoCalculo
  try {
    resultado = calcularIndicadores(entrada)
  } catch (erro) {
    if (!(erro instanceof CalculoSemRespondentes)) {
      throw erro
    }
    return prisma.execucaoCalculo.create({
      data: { ...dadosExecucao, status: 'FALHOU', mensagemErro: erro.message },
      ...execucaoComIndicadores,
    })
  }

  return prisma.execucaoCalculo.create({
    data: {
      ...dadosExecucao,
      status: 'CONCLUIDO',
      mensagemErro: descreverPendencias(resultado),
      indicadores: {
        createMany: {
          data: converterEmLinhas(resultado).map((linha) => ({ ...linha, valor: linha.valor.toFixed(6) })),
        },
      },
    },
    ...execucaoComIndicadores,
  })
}

export async function consultarIndicadoresDaPesquisa(pesquisaId: bigint) {
  const pesquisa = await buscarPesquisa(pesquisaId)

  const periodos = await Promise.all(
    pesquisa.periodos.map(async ({ periodo }) => {
      const ultimaExecucao = await prisma.execucaoCalculo.findFirst({
        where: { pesquisaId, periodoId: periodo.id },
        orderBy: [{ calculadoEm: 'desc' }, { id: 'desc' }],
        ...execucaoComIndicadores,
      })
      return { periodo: apresentarPeriodo(periodo), ...apresentarExecucao(ultimaExecucao) }
    }),
  )

  return { pesquisaId: pesquisaId.toString(), periodos }
}

export async function recalcularSeJaCalculado(pesquisaId: bigint, administradorId?: bigint) {
  const ultimaExecucao = await prisma.execucaoCalculo.findFirst({
    where: { pesquisaId },
    orderBy: [{ calculadoEm: 'desc' }, { id: 'desc' }],
  })

  if (!ultimaExecucao) {
    return false
  }

  await calcularIndicadoresDaPesquisa(pesquisaId, administradorId ?? ultimaExecucao.executadoPor)
  return true
}
