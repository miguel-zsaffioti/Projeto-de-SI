// Prazo de resposta da pesquisa (RN01): por padrão, 5 dias úteis após a abertura.
// A regra de dias úteis fica em diasUteis.ts.
// O prazo termina às 23:59:59 do dia, no horário de Brasília (UTC-3, sem horário de verão).

import { adicionarDiasUteis } from './diasUteis'

const FUSO = 'America/Sao_Paulo'
const DIAS_UTEIS_PADRAO = 5

const formatadorDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/

function diaIsoValido(dia: string): boolean {
  if (!DIA_ISO.test(dia)) return false
  const data = new Date(`${dia}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === dia
}

export function diaNoBrasil(data: Date): string {
  return formatadorDia.format(data)
}

export function fimDoDiaNoBrasil(dia: string): Date {
  return new Date(`${dia}T23:59:59-03:00`)
}

export function calcularPrazoPadrao(abertura: Date = new Date()) {
  const data = adicionarDiasUteis(diaNoBrasil(abertura), DIAS_UTEIS_PADRAO)
  return { data, prazo: fimDoDiaNoBrasil(data) }
}

// Aceita "AAAA-MM-DD" (vale até o fim desse dia) ou uma data e hora ISO completa.
export function interpretarPrazo(valor: string): Date | null {
  if (DIA_ISO.test(valor)) {
    return diaIsoValido(valor) ? fimDoDiaNoBrasil(valor) : null
  }

  if (!/^\d{4}-\d{2}-\d{2}T/.test(valor)) return null

  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export { diaIsoValido }
