import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CalculoSemRespondentes,
  EntradaCalculo,
  calcularIndicadores,
  classificarFaixa,
  contarDiarias,
  leitosMedios,
} from '../src/modules/indicadores/calculo'
import {
  diariasMediasDaPlanilha,
  inventarioDaPlanilha,
  percentualDayUseDaPlanilha,
  periodosDaPlanilha,
  rhcDaPlanilha,
} from './planilha-oto'

function quaseIgual(recebido: number, esperado: number, casas = 2) {
  const tolerancia = 10 ** -casas
  assert.ok(
    Math.abs(recebido - esperado) <= tolerancia,
    `esperado ${esperado}, recebido ${recebido} (tolerância ${tolerancia})`,
  )
}

function montarEntrada(taxasInformadas: Record<string, number>, diarias: number): EntradaCalculo {
  return {
    diarias,
    meiosHospedagem: inventarioDaPlanilha,
    rhc: rhcDaPlanilha,
    percentualDayUse: percentualDayUseDaPlanilha,
    diariasMedias: diariasMediasDaPlanilha,
    respostas: Object.entries(taxasInformadas).map(([estabelecimentoId, taxaOcupacao]) => ({
      estabelecimentoId,
      taxaOcupacao,
    })),
  }
}

describe('Indicadores conferidos com a planilha do OTO', () => {
  for (const periodo of periodosDaPlanilha) {
    describe(periodo.nome, () => {
      const resultado = calcularIndicadores(montarEntrada(periodo.taxasInformadas, periodo.diarias))
      const { esperado } = periodo

      it('conta as diárias do período', () => {
        assert.equal(contarDiarias(new Date(periodo.dataInicio), new Date(periodo.dataFim)), periodo.diarias)
      })

      it('taxa de ocupação ponderada (RN12)', () => {
        quaseIgual(resultado.taxaOcupacaoPonderada, esperado.taxaOcupacaoPonderada, 4)
      })

      it('turistas em meios de hospedagem regulares (RN13 e RN14)', () => {
        quaseIgual(resultado.turistas.respondentes, esperado.turistasRespondentes)
        quaseIgual(resultado.turistas.naoRespondentes, esperado.turistasNaoRespondentes)
        quaseIgual(resultado.turistas.meiosRegulares, esperado.turistasMeiosRegulares)
      })

      it('turistas em RHC (RN15)', () => {
        quaseIgual(resultado.turistas.rhc, esperado.turistasRhc)
      })

      it('day use (RN16)', () => {
        quaseIgual(resultado.turistas.dayUsePorDia, esperado.dayUsePorDia)
        quaseIgual(resultado.turistas.dayUse, esperado.dayUse)
      })

      it('total de turistas e média por dia (RN17)', () => {
        quaseIgual(resultado.turistas.total, esperado.turistasTotal)
        quaseIgual(resultado.turistas.totalPorDia, esperado.turistasPorDia)
      })

      it('cobertura da pesquisa (RN18)', () => {
        quaseIgual(resultado.cobertura.percentualEstabelecimentos, esperado.coberturaEstabelecimentos, 4)
        quaseIgual(resultado.cobertura.percentualLeitos, esperado.coberturaLeitos, 4)
      })

      it('distribuição por faixa de ocupação', () => {
        assert.deepEqual(resultado.faixasOcupacao, esperado.faixas)
      })

      it('RevPAR e receita estimada por tipo (RN19)', () => {
        for (const linha of esperado.revpar) {
          const aritmetica = resultado.revpar.find((r) => r.categoria === linha.categoria && r.metodo === 'ARITMETICA')!
          const ponderada = resultado.revpar.find((r) => r.categoria === linha.categoria && r.metodo === 'PONDERADA')!
          quaseIgual(aritmetica.revpar, linha.aritmetica)
          quaseIgual(ponderada.revpar, linha.ponderada)
        }
        for (const linha of esperado.receitaEstimada) {
          const aritmetica = resultado.revpar.find((r) => r.categoria === linha.categoria && r.metodo === 'ARITMETICA')!
          const ponderada = resultado.revpar.find((r) => r.categoria === linha.categoria && r.metodo === 'PONDERADA')!
          quaseIgual(aritmetica.receitaEstimada, linha.aritmetica)
          quaseIgual(ponderada.receitaEstimada, linha.ponderada)
        }
      })
    })
  }
})

describe('Regras de cálculo isoladas', () => {
  it('leitos médios = UH × (mínimo + máximo) / 2 (RN11)', () => {
    assert.equal(leitosMedios({ totalUh: 85, leitosMinPorUh: 1, leitosMaxPorUh: 4 }), 212.5)
  })

  it('classifica as faixas de ocupação', () => {
    assert.equal(classificarFaixa(100), 'EXCELENTE')
    assert.equal(classificarFaixa(81), 'EXCELENTE')
    assert.equal(classificarFaixa(80), 'OTIMA')
    assert.equal(classificarFaixa(61), 'OTIMA')
    assert.equal(classificarFaixa(60), 'BOA')
    assert.equal(classificarFaixa(40), 'REGULAR')
    assert.equal(classificarFaixa(20), 'RUIM')
    assert.equal(classificarFaixa(0), 'RUIM')
  })

  it('sem respondentes no período não calcula (UC09 E1)', () => {
    assert.throws(() => calcularIndicadores(montarEntrada({}, 31)), CalculoSemRespondentes)
  })

  it('ignora resposta de estabelecimento fora do inventário', () => {
    const resultado = calcularIndicadores(montarEntrada({ 'MH-001': 50, 'MH-999': 100 }, 1))
    assert.equal(resultado.cobertura.estabelecimentosRespondentes, 1)
    assert.equal(resultado.taxaOcupacaoPonderada, 50)
  })

  it('com um só respondente, todos recebem a taxa dele', () => {
    const resultado = calcularIndicadores(montarEntrada({ 'MH-005': 50 }, 1))
    const leitosDoInventario = 6396.5
    quaseIgual(resultado.turistas.meiosRegulares, leitosDoInventario * 0.5)
  })

  it('tipo sem respondentes usa a taxa ponderada geral no RevPAR', () => {
    const resultado = calcularIndicadores(montarEntrada({ 'MH-001': 80, 'MH-004': 40 }, 1))
    assert.equal(resultado.taxaOcupacaoPorCategoria.POUSADA, resultado.taxaOcupacaoPonderada)
  })

  it('diária média ausente deixa o RevPAR do tipo pendente e calcula o resto (UC09 E2)', () => {
    const entrada = montarEntrada({ 'MH-001': 80 }, 1)
    entrada.diariasMedias = entrada.diariasMedias.filter((diaria) => diaria.categoria !== 'POUSADA')

    const resultado = calcularIndicadores(entrada)

    assert.deepEqual(resultado.revparPendentes, [
      { categoria: 'POUSADA', metodo: 'ARITMETICA' },
      { categoria: 'POUSADA', metodo: 'PONDERADA' },
    ])
    assert.equal(resultado.revpar.length, 6)
    assert.ok(resultado.turistas.total > 0)
  })

  it('day use zero não acrescenta turistas', () => {
    const entrada = montarEntrada({ 'MH-001': 80 }, 1)
    entrada.percentualDayUse = 0
    const resultado = calcularIndicadores(entrada)
    assert.equal(resultado.turistas.dayUse, 0)
  })
})
