import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ZodError } from 'zod'
import { criarLinkWhatsApp, criarMensagemWhatsApp } from '../src/modules/respondentes/respondentes.formatacao'
import { reenviarSchema } from '../src/modules/respondentes/respondentes.schemas'
import { LinhaCsv, montarCsv } from '../src/modules/indicadores/exportacao.service'

describe('Reenvio de link', () => {
  it('exige o token original de cada convite', () => {
    assert.throws(
      () => reenviarSchema.parse({ conviteIds: ['1'], canal: 'EMAIL' }),
      (erro: unknown) => erro instanceof ZodError,
    )
  })

  it('gera mensagem e ação de WhatsApp com texto preenchido', () => {
    const mensagem = criarMensagemWhatsApp('Hotel Central', 'http://localhost:5173/responder/abc')
    const url = criarLinkWhatsApp('(17) 99999-1234', mensagem)

    assert.equal(mensagem, 'Olá, Hotel Central! Responda à pesquisa do OTO pelo link: http://localhost:5173/responder/abc')
    assert.match(url, /^https:\/\/wa\.me\/17999991234\?text=/)
    assert.match(url, /Hotel%20Central/)
  })

  it('rejeita telefone de WhatsApp inválido', () => {
    assert.throws(() => criarLinkWhatsApp('123', 'mensagem'), /número de WhatsApp cadastrado é inválido/)
  })
})

describe('Exportação CSV', () => {
  const linha: LinhaCsv = {
    pesquisaId: '10',
    periodoId: '2',
    periodo: 'Feriado, Finados',
    dataInicio: '2026-10-31',
    dataFim: '2026-11-02',
    codigo: 'TAXA_OCUPACAO_PONDERADA',
    dimensao: 'TOTAL',
    valor: 72.5,
    unidade: '%',
    origem: 'CALCULADO',
    referenciaEm: new Date('2026-11-01T12:00:00.000Z'),
  }

  it('gera cabeçalho, BOM e campos com vírgula entre aspas', () => {
    const csv = montarCsv([linha])
    const linhas = csv.split('\r\n')

    assert.ok(csv.startsWith('\uFEFFpesquisa_id,'))
    assert.match(linhas[1], /^10,2,"Feriado, Finados",2026-10-31,2026-11-02,/)
    assert.match(linhas[1], /,72\.5,%,CALCULADO,2026-11-01T12:00:00\.000Z$/)
  })

  it('escapa aspas nos valores exportados', () => {
    const csv = montarCsv([{ ...linha, periodo: 'Período "especial"' }])
    assert.match(csv, /"Período ""especial"""/)
  })
})
