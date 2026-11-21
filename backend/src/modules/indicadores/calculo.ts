import type { CategoriaDiaria, MetodoDiaria, TipoHospedagem } from '@prisma/client'

export type MeioHospedagem = {
  id: string
  tipo: TipoHospedagem
  totalUh: number
  leitosMinPorUh: number
  leitosMaxPorUh: number
}

export type CapacidadeRhc = {
  totalUh: number
  leitosMinPorUh: number
  leitosMaxPorUh: number
}

export type TaxaInformada = {
  estabelecimentoId: string
  taxaOcupacao: number
}

export type DiariaMedia = {
  categoria: CategoriaDiaria
  metodo: MetodoDiaria
  valor: number
}

export type EntradaCalculo = {
  diarias: number
  meiosHospedagem: MeioHospedagem[]
  rhc: CapacidadeRhc
  respostas: TaxaInformada[]
  percentualDayUse: number
  diariasMedias: DiariaMedia[]
}

export type NomeFaixa = 'EXCELENTE' | 'OTIMA' | 'BOA' | 'REGULAR' | 'RUIM'

export type ResultadoRevpar = {
  categoria: CategoriaDiaria
  metodo: MetodoDiaria
  taxaOcupacao: number
  diariaMedia: number
  revpar: number
  unidadesHabitacionais: number
  receitaEstimada: number
}

export type PendenciaRevpar = {
  categoria: CategoriaDiaria
  metodo: MetodoDiaria
}

export type ResultadoCalculo = {
  taxaOcupacaoPonderada: number
  turistas: {
    respondentes: number
    naoRespondentes: number
    meiosRegulares: number
    rhc: number
    dayUsePorDia: number
    dayUse: number
    total: number
    totalPorDia: number
  }
  cobertura: {
    estabelecimentosRespondentes: number
    estabelecimentosTotal: number
    percentualEstabelecimentos: number
    leitosRespondentes: number
    leitosTotal: number
    percentualLeitos: number
  }
  faixasOcupacao: Record<NomeFaixa, number>
  taxaOcupacaoPorCategoria: Record<CategoriaDiaria, number>
  revpar: ResultadoRevpar[]
  revparPendentes: PendenciaRevpar[]
}

export class CalculoSemRespondentes extends Error {
  constructor() {
    super('Nenhum estabelecimento respondeu este período; não é possível calcular a taxa ponderada.')
  }
}

const CATEGORIAS: CategoriaDiaria[] = ['HOTEL', 'RESORT', 'POUSADA', 'GERAL']
const METODOS: MetodoDiaria[] = ['ARITMETICA', 'PONDERADA']

const FAIXAS: { nome: NomeFaixa; acimaDe: number }[] = [
  { nome: 'EXCELENTE', acimaDe: 80 },
  { nome: 'OTIMA', acimaDe: 60 },
  { nome: 'BOA', acimaDe: 40 },
  { nome: 'REGULAR', acimaDe: 20 },
  { nome: 'RUIM', acimaDe: -Infinity },
]

export function leitosMedios(capacidade: { totalUh: number; leitosMinPorUh: number; leitosMaxPorUh: number }) {
  return capacidade.totalUh * ((capacidade.leitosMinPorUh + capacidade.leitosMaxPorUh) / 2)
}

export function contarDiarias(dataInicio: Date, dataFim: Date) {
  const UM_DIA_EM_MS = 24 * 60 * 60 * 1000
  return Math.round((dataFim.getTime() - dataInicio.getTime()) / UM_DIA_EM_MS) + 1
}

export function classificarFaixa(taxaOcupacao: number): NomeFaixa {
  return FAIXAS.find((faixa) => taxaOcupacao > faixa.acimaDe)!.nome
}

function somar(valores: number[]) {
  return valores.reduce((total, valor) => total + valor, 0)
}

function taxaPonderada(respondentes: { meio: MeioHospedagem; taxaOcupacao: number }[]) {
  const totalUh = somar(respondentes.map(({ meio }) => meio.totalUh))
  return somar(respondentes.map(({ meio, taxaOcupacao }) => taxaOcupacao * (meio.totalUh / totalUh)))
}

function pertenceACategoria(tipo: TipoHospedagem, categoria: CategoriaDiaria) {
  return categoria === 'GERAL' || tipo === categoria
}

export function calcularIndicadores(entrada: EntradaCalculo): ResultadoCalculo {
  const { diarias, meiosHospedagem, rhc, percentualDayUse } = entrada
  const meiosPorId = new Map(meiosHospedagem.map((meio) => [meio.id, meio]))

  const respondentes = entrada.respostas
    .filter(({ estabelecimentoId }) => meiosPorId.has(estabelecimentoId))
    .map(({ estabelecimentoId, taxaOcupacao }) => ({ meio: meiosPorId.get(estabelecimentoId)!, taxaOcupacao }))

  if (respondentes.length === 0) {
    throw new CalculoSemRespondentes()
  }

  const taxaGeral = taxaPonderada(respondentes)

  const leitosTotal = somar(meiosHospedagem.map(leitosMedios))
  const leitosRespondentes = somar(respondentes.map(({ meio }) => leitosMedios(meio)))

  const turistasRespondentes = somar(
    respondentes.map(({ meio, taxaOcupacao }) => leitosMedios(meio) * (taxaOcupacao / 100) * diarias),
  )
  const turistasNaoRespondentes = (leitosTotal - leitosRespondentes) * (taxaGeral / 100) * diarias
  const turistasMeiosRegulares = turistasRespondentes + turistasNaoRespondentes
  const turistasRhc = leitosMedios(rhc) * (taxaGeral / 100) * diarias

  const hospedadosPorDia = (turistasMeiosRegulares + turistasRhc) / diarias
  const dayUsePorDia = hospedadosPorDia / (1 - percentualDayUse / 100) - hospedadosPorDia
  const dayUse = dayUsePorDia * diarias
  const total = turistasMeiosRegulares + turistasRhc + dayUse

  const faixasOcupacao = Object.fromEntries(FAIXAS.map(({ nome }) => [nome, 0])) as Record<NomeFaixa, number>
  respondentes.forEach(({ taxaOcupacao }) => {
    faixasOcupacao[classificarFaixa(taxaOcupacao)] += 1
  })

  const taxaOcupacaoPorCategoria = Object.fromEntries(
    CATEGORIAS.map((categoria) => {
      const daCategoria = respondentes.filter(({ meio }) => pertenceACategoria(meio.tipo, categoria))
      return [categoria, daCategoria.length > 0 ? taxaPonderada(daCategoria) : taxaGeral]
    }),
  ) as Record<CategoriaDiaria, number>

  const revpar: ResultadoRevpar[] = []
  const revparPendentes: PendenciaRevpar[] = []

  for (const categoria of CATEGORIAS) {
    const unidadesHabitacionais = somar(
      meiosHospedagem.filter((meio) => pertenceACategoria(meio.tipo, categoria)).map((meio) => meio.totalUh),
    )

    for (const metodo of METODOS) {
      const diariaMedia = entrada.diariasMedias.find((item) => item.categoria === categoria && item.metodo === metodo)

      if (!diariaMedia) {
        revparPendentes.push({ categoria, metodo })
        continue
      }

      const taxaOcupacao = taxaOcupacaoPorCategoria[categoria]
      const revparDaCategoria = diariaMedia.valor * (taxaOcupacao / 100)

      revpar.push({
        categoria,
        metodo,
        taxaOcupacao,
        diariaMedia: diariaMedia.valor,
        revpar: revparDaCategoria,
        unidadesHabitacionais,
        receitaEstimada: revparDaCategoria * unidadesHabitacionais * diarias,
      })
    }
  }

  return {
    taxaOcupacaoPonderada: taxaGeral,
    turistas: {
      respondentes: turistasRespondentes,
      naoRespondentes: turistasNaoRespondentes,
      meiosRegulares: turistasMeiosRegulares,
      rhc: turistasRhc,
      dayUsePorDia,
      dayUse,
      total,
      totalPorDia: total / diarias,
    },
    cobertura: {
      estabelecimentosRespondentes: respondentes.length,
      estabelecimentosTotal: meiosHospedagem.length,
      percentualEstabelecimentos: (respondentes.length / meiosHospedagem.length) * 100,
      leitosRespondentes,
      leitosTotal,
      percentualLeitos: (leitosRespondentes / leitosTotal) * 100,
    },
    faixasOcupacao,
    taxaOcupacaoPorCategoria,
    revpar,
    revparPendentes,
  }
}
