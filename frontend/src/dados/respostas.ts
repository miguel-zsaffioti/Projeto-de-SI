export type StatusConviteTela = 'RESPONDIDO' | 'PENDENTE'

export type PesquisaTela = {
  id: string
  nome: string
}

export type ConviteTela = {
  id: string
  pesquisaId: string
  estabelecimento: string
  status: StatusConviteTela
  respondidoEm: string | null
}

export const pesquisasTela: PesquisaTela[] = [
  { id: 'consolidado-fev-2025', nome: 'Consolidado · Fevereiro/2025' },
  { id: 'expectativa-carnaval', nome: 'Expectativa · Carnaval' },
]

const convitesConsolidados: Array<[string, string | null]> = [
  ['Resort Águas Quentes', '2025-02-18T16:42:00'],
  ['Grand Resort Olímpia Park', '2025-02-18T15:10:00'],
  ['Hotel Central Olímpia', '2025-02-18T14:32:00'],
  ['Hotel Jardim das Palmeiras', '2025-02-18T11:05:00'],
  ['Hotel Solar do Turista', '2025-02-17T18:20:00'],
  ['Pousada Sol Nascente', '2025-02-17T16:48:00'],
  ['Pousada Recanto das Flores', '2025-02-17T15:12:00'],
  ['Flat Residence Olímpia', '2025-02-17T10:18:00'],
  ['Resort Vale das Termas', null],
  ['Hotel Fazenda Recanto Verde', null],
  ['Pousada Caminho das Águas', null],
  ['Pousada Ipê Amarelo', null],
  ['Hostel Mochileiro Feliz', null],
]

const convitesExpectativa: Array<[string, string | null]> = [
  ['Pousada Sol Nascente', '2025-02-18T11:15:00'],
  ['Pousada Recanto das Flores', '2025-02-18T09:40:00'],
  ['Resort Águas Quentes', '2025-02-17T19:05:00'],
  ['Hotel Central Olímpia', '2025-02-17T17:22:00'],
  ['Grand Resort Olímpia Park', '2025-02-17T14:08:00'],
  ['Pousada Ipê Amarelo', '2025-02-16T18:30:00'],
  ['Resort Vale das Termas', null],
  ['Hotel Jardim das Palmeiras', null],
  ['Hotel Solar do Turista', null],
  ['Hotel Fazenda Recanto Verde', null],
  ['Pousada Caminho das Águas', null],
  ['Flat Residence Olímpia', null],
  ['Hostel Mochileiro Feliz', null],
]

function montarConvites(pesquisaId: string, linhas: Array<[string, string | null]>): ConviteTela[] {
  return linhas.map(([estabelecimento, respondidoEm], indice) => ({
    id: `${pesquisaId}-${indice + 1}`,
    pesquisaId,
    estabelecimento,
    status: respondidoEm ? 'RESPONDIDO' : 'PENDENTE',
    respondidoEm,
  }))
}

export const convitesTela: ConviteTela[] = [
  ...montarConvites('consolidado-fev-2025', convitesConsolidados),
  ...montarConvites('expectativa-carnaval', convitesExpectativa),
]

export const TAMANHO_PAGINA = 6

export function formatarDataHora(iso: string) {
  const [data, hora] = iso.split('T')
  const [ano, mes, dia] = data.split('-')
  const [hh, mm] = hora.split(':')
  return `${dia}/${mes}/${ano} às ${hh}:${mm}`
}

export function percentual(parte: number, total: number) {
  if (total === 0) return 0
  return Math.round((parte / total) * 100)
}

export function filtrarConvites(convites: ConviteTela[], pesquisaId: string, busca: string) {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  return convites
    .filter((convite) => convite.pesquisaId === pesquisaId)
    .filter((convite) => convite.estabelecimento.toLocaleLowerCase('pt-BR').includes(termo))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'RESPONDIDO' ? -1 : 1
      if (a.respondidoEm && b.respondidoEm) return b.respondidoEm.localeCompare(a.respondidoEm)
      return a.estabelecimento.localeCompare(b.estabelecimento, 'pt-BR')
    })
}

function campoCsv(valor: string) {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`
  return valor
}

export function montarCsv(convites: ConviteTela[], nomePesquisa: string) {
  const cabecalho = ['Estabelecimento', 'Pesquisa', 'Data e hora da resposta', 'Status']
  const linhas = convites.map((convite) => [
    convite.estabelecimento,
    nomePesquisa,
    convite.respondidoEm ? formatarDataHora(convite.respondidoEm) : '',
    convite.status === 'RESPONDIDO' ? 'Respondido' : 'Pendente',
  ])
  return [cabecalho, ...linhas].map((colunas) => colunas.map(campoCsv).join(',')).join('\n')
}

export function baixarCsv(conteudo: string, nomeArquivo: string) {
  const arquivo = new Blob([`\uFEFF${conteudo}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(arquivo)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(url)
}
