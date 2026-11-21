import type { DiariaMedia, MeioHospedagem, NomeFaixa } from '../src/modules/indicadores/calculo'

export const inventarioDaPlanilha: MeioHospedagem[] = [
  { id: 'MH-001', tipo: 'RESORT', totalUh: 420, leitosMinPorUh: 2, leitosMaxPorUh: 6 },
  { id: 'MH-002', tipo: 'RESORT', totalUh: 310, leitosMinPorUh: 2, leitosMaxPorUh: 5 },
  { id: 'MH-003', tipo: 'RESORT', totalUh: 560, leitosMinPorUh: 2, leitosMaxPorUh: 6 },
  { id: 'MH-004', tipo: 'HOTEL', totalUh: 85, leitosMinPorUh: 1, leitosMaxPorUh: 4 },
  { id: 'MH-005', tipo: 'HOTEL', totalUh: 120, leitosMinPorUh: 2, leitosMaxPorUh: 4 },
  { id: 'MH-006', tipo: 'HOTEL', totalUh: 64, leitosMinPorUh: 2, leitosMaxPorUh: 3 },
  { id: 'MH-007', tipo: 'OUTRO', totalUh: 48, leitosMinPorUh: 2, leitosMaxPorUh: 5 },
  { id: 'MH-008', tipo: 'POUSADA', totalUh: 22, leitosMinPorUh: 2, leitosMaxPorUh: 4 },
  { id: 'MH-009', tipo: 'POUSADA', totalUh: 18, leitosMinPorUh: 2, leitosMaxPorUh: 3 },
  { id: 'MH-010', tipo: 'POUSADA', totalUh: 15, leitosMinPorUh: 2, leitosMaxPorUh: 4 },
  { id: 'MH-011', tipo: 'POUSADA', totalUh: 12, leitosMinPorUh: 2, leitosMaxPorUh: 3 },
  { id: 'MH-012', tipo: 'FLAT', totalUh: 70, leitosMinPorUh: 2, leitosMaxPorUh: 5 },
  { id: 'MH-013', tipo: 'HOSTEL', totalUh: 10, leitosMinPorUh: 4, leitosMaxPorUh: 8 },
]

export const rhcDaPlanilha = { totalUh: 850, leitosMinPorUh: 2, leitosMaxPorUh: 4 }

export const percentualDayUseDaPlanilha = 15.15

export const diariasMediasDaPlanilha: DiariaMedia[] = [
  { categoria: 'HOTEL', metodo: 'ARITMETICA', valor: 320 },
  { categoria: 'HOTEL', metodo: 'PONDERADA', valor: 345 },
  { categoria: 'RESORT', metodo: 'ARITMETICA', valor: 780 },
  { categoria: 'RESORT', metodo: 'PONDERADA', valor: 820 },
  { categoria: 'POUSADA', metodo: 'ARITMETICA', valor: 210 },
  { categoria: 'POUSADA', metodo: 'PONDERADA', valor: 225 },
  { categoria: 'GERAL', metodo: 'ARITMETICA', valor: 430 },
  { categoria: 'GERAL', metodo: 'PONDERADA', valor: 470 },
]

type ReceitaEsperada = { categoria: 'HOTEL' | 'RESORT' | 'POUSADA' | 'GERAL'; aritmetica: number; ponderada: number }

export type PeriodoDaPlanilha = {
  nome: string
  dataInicio: string
  dataFim: string
  diarias: number
  taxasInformadas: Record<string, number>
  esperado: {
    taxaOcupacaoPonderada: number
    turistasRespondentes: number
    turistasNaoRespondentes: number
    turistasMeiosRegulares: number
    turistasRhc: number
    dayUsePorDia: number
    dayUse: number
    turistasTotal: number
    turistasPorDia: number
    coberturaEstabelecimentos: number
    coberturaLeitos: number
    faixas: Record<NomeFaixa, number>
    revpar: ReceitaEsperada[]
    receitaEstimada: ReceitaEsperada[]
  }
}

export const periodosDaPlanilha: PeriodoDaPlanilha[] = [
  {
    nome: 'Outubro/2026',
    dataInicio: '2026-10-01',
    dataFim: '2026-10-31',
    diarias: 31,
    taxasInformadas: {
      'MH-001': 78,
      'MH-002': 65.5,
      'MH-004': 52,
      'MH-005': 60,
      'MH-007': 45,
      'MH-008': 85,
      'MH-009': 40,
      'MH-012': 70,
    },
    esperado: {
      taxaOcupacaoPonderada: 68.0101,
      turistasRespondentes: 82732.03,
      turistasNaoRespondentes: 53445.71,
      turistasMeiosRegulares: 136177.73,
      turistasRhc: 53761.96,
      dayUsePorDia: 1093.99,
      dayUse: 33913.8,
      turistasTotal: 223853.49,
      turistasPorDia: 7221.08,
      coberturaEstabelecimentos: 61.5385,
      coberturaLeitos: 60.369,
      faixas: { EXCELENTE: 1, OTIMA: 3, BOA: 3, REGULAR: 1, RUIM: 0 },
      revpar: [
        { categoria: 'HOTEL', aritmetica: 181.39, ponderada: 195.56 },
        { categoria: 'RESORT', aritmetica: 567.0, ponderada: 596.07 },
        { categoria: 'POUSADA', aritmetica: 135.98, ponderada: 145.69 },
        { categoria: 'GERAL', aritmetica: 292.44, ponderada: 319.65 },
      ],
      receitaEstimada: [
        { categoria: 'HOTEL', aritmetica: 1512572.57, ponderada: 1630742.3 },
        { categoria: 'RESORT', aritmetica: 22674165.66, ponderada: 23836943.38 },
        { categoria: 'POUSADA', aritmetica: 282420.08, ponderada: 302592.94 },
        { categoria: 'GERAL', aritmetica: 15901310.66, ponderada: 17380502.34 },
      ],
    },
  },
  {
    nome: 'Feriado de Finados 2026',
    dataInicio: '2026-10-31',
    dataFim: '2026-11-02',
    diarias: 3,
    taxasInformadas: {
      'MH-001': 96,
      'MH-002': 92,
      'MH-004': 88,
      'MH-005': 100,
      'MH-007': 80,
      'MH-008': 100,
      'MH-009': 75,
      'MH-012': 95,
    },
    esperado: {
      taxaOcupacaoPonderada: 93.6505,
      turistasRespondentes: 10874.7,
      turistasNaoRespondentes: 7122.12,
      turistasMeiosRegulares: 17996.82,
      turistasRhc: 7164.26,
      dayUsePorDia: 1497.51,
      dayUse: 4492.52,
      turistasTotal: 29653.61,
      turistasPorDia: 9884.54,
      coberturaEstabelecimentos: 61.5385,
      coberturaLeitos: 60.369,
      faixas: { EXCELENTE: 6, OTIMA: 2, BOA: 0, REGULAR: 0, RUIM: 0 },
      revpar: [
        { categoria: 'HOTEL', aritmetica: 304.08, ponderada: 327.83 },
        { categoria: 'RESORT', aritmetica: 735.55, ponderada: 773.27 },
        { categoria: 'POUSADA', aritmetica: 186.38, ponderada: 199.69 },
        { categoria: 'GERAL', aritmetica: 402.7, ponderada: 440.16 },
      ],
      receitaEstimada: [
        { categoria: 'HOTEL', aritmetica: 245390.99, ponderada: 264562.16 },
        { categoria: 'RESORT', aritmetica: 2846581.15, ponderada: 2992559.67 },
        { categoria: 'POUSADA', aritmetica: 37461.38, ponderada: 40137.19 },
        { categoria: 'GERAL', aritmetica: 2118992.48, ponderada: 2316108.05 },
      ],
    },
  },
]
