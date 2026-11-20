// Regra de dias úteis do sistema (RN01: a pesquisa fica aberta por 5 dias úteis).
// Hoje só sábado e domingo não contam. Para considerar feriados, quando o OTO validar essa regra,
// basta preencher FERIADOS com datas "AAAA-MM-DD": todo o resto passa a respeitá-los.

const FERIADOS: ReadonlySet<string> = new Set<string>()

export function ehDiaUtil(dia: string): boolean {
  const diaDaSemana = new Date(`${dia}T12:00:00Z`).getUTCDay()
  return diaDaSemana !== 0 && diaDaSemana !== 6 && !FERIADOS.has(dia)
}

export function adicionarDiasUteis(dia: string, quantidade: number): string {
  const data = new Date(`${dia}T12:00:00Z`)
  let restantes = quantidade

  while (restantes > 0) {
    data.setUTCDate(data.getUTCDate() + 1)
    if (ehDiaUtil(data.toISOString().slice(0, 10))) {
      restantes -= 1
    }
  }

  return data.toISOString().slice(0, 10)
}
