export type TipoPesquisaTela = 'CONSOLIDADA' | 'EXPECTATIVA'
export type TipoCampo = 'percentual' | 'boletim' | 'email'

export type CampoAuditoria = {
  id: string
  rotulo: string
  tipo: TipoCampo
  valor: string | null
  excluido: boolean
}

export type RespostaAuditoria = {
  id: string
  estabelecimento: string
  pesquisa: TipoPesquisaTela
  campos: CampoAuditoria[]
}

export type RegistroHistorico = {
  id: string
  quando: string
  usuario: string
  papel: string
  respostaId: string
  estabelecimento: string
  campo: string
  valorAnterior: string
  valorNovo: string
  acao: string
}

export const respostasIniciais: RespostaAuditoria[] = [
  {
    id: '101',
    estabelecimento: 'Hotel Central Olímpia',
    pesquisa: 'CONSOLIDADA',
    campos: [
      { id: '101-fev', rotulo: 'Taxa de ocupação · Fevereiro/2025', tipo: 'percentual', valor: '68', excluido: false },
      { id: '101-carnaval', rotulo: 'Taxa de ocupação · Carnaval', tipo: 'percentual', valor: '81', excluido: false },
      { id: '101-finados', rotulo: 'Taxa de ocupação · Finados', tipo: 'percentual', valor: '55', excluido: true },
      { id: '101-boletim', rotulo: 'Preferência do boletim', tipo: 'boletim', valor: 'EMAIL', excluido: false },
      { id: '101-email', rotulo: 'E-mail de confirmação', tipo: 'email', valor: 'contato@centralolimpia.example.com', excluido: false },
    ],
  },
  {
    id: '102',
    estabelecimento: 'Pousada Sol Nascente',
    pesquisa: 'EXPECTATIVA',
    campos: [
      { id: '102-carnaval', rotulo: 'Taxa de ocupação · Carnaval', tipo: 'percentual', valor: '74', excluido: false },
      { id: '102-corpus', rotulo: 'Taxa de ocupação · Corpus Christi', tipo: 'percentual', valor: '62', excluido: false },
      { id: '102-boletim', rotulo: 'Preferência do boletim', tipo: 'boletim', valor: 'WHATSAPP', excluido: false },
      { id: '102-email', rotulo: 'E-mail de confirmação', tipo: 'email', valor: null, excluido: false },
    ],
  },
  {
    id: '103',
    estabelecimento: 'Hotel Jardim das Palmeiras',
    pesquisa: 'CONSOLIDADA',
    campos: [
      { id: '103-fev', rotulo: 'Taxa de ocupação · Fevereiro/2025', tipo: 'percentual', valor: '82', excluido: false },
      { id: '103-carnaval', rotulo: 'Taxa de ocupação · Carnaval', tipo: 'percentual', valor: '90', excluido: false },
      { id: '103-boletim', rotulo: 'Preferência do boletim', tipo: 'boletim', valor: 'NAO_QUERO', excluido: false },
      { id: '103-email', rotulo: 'E-mail de confirmação', tipo: 'email', valor: null, excluido: false },
    ],
  },
  {
    id: '104',
    estabelecimento: 'Pousada Recanto das Flores',
    pesquisa: 'EXPECTATIVA',
    campos: [
      { id: '104-natal', rotulo: 'Taxa de ocupação · Natal', tipo: 'percentual', valor: '55', excluido: false },
      { id: '104-ano', rotulo: 'Taxa de ocupação · Ano Novo', tipo: 'percentual', valor: '70', excluido: false },
      { id: '104-boletim', rotulo: 'Preferência do boletim', tipo: 'boletim', valor: 'EMAIL', excluido: false },
      { id: '104-email', rotulo: 'E-mail de confirmação', tipo: 'email', valor: 'contato@recantodasflores.example.com', excluido: false },
    ],
  },
]

export const historicoInicial: RegistroHistorico[] = [
  {
    id: 'h1',
    quando: '18/02/2025 às 14:32',
    usuario: 'Administrador OTO',
    papel: 'Coordenação',
    respostaId: '101',
    estabelecimento: 'Hotel Central Olímpia',
    campo: 'Taxa de ocupação · Fevereiro/2025',
    valorAnterior: '72%',
    valorNovo: '68%',
    acao: 'Correção do administrador',
  },
  {
    id: 'h2',
    quando: '18/02/2025 às 11:15',
    usuario: 'Administrador OTO',
    papel: 'Coordenação',
    respostaId: '102',
    estabelecimento: 'Pousada Sol Nascente',
    campo: 'Taxa de ocupação · Carnaval',
    valorAnterior: '70%',
    valorNovo: '74%',
    acao: 'Correção do administrador',
  },
  {
    id: 'h3',
    quando: '17/02/2025 às 16:40',
    usuario: 'Administrador OTO',
    papel: 'Coordenação',
    respostaId: '101',
    estabelecimento: 'Hotel Central Olímpia',
    campo: 'Taxa de ocupação · Finados',
    valorAnterior: '55%',
    valorNovo: 'Excluído',
    acao: 'Campo excluído',
  },
]

const BOLETINS: Record<string, string> = {
  NAO_QUERO: 'Não quero receber',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  OUTRO: 'Outro',
}

export function rotuloPesquisa(tipo: TipoPesquisaTela) {
  return tipo === 'CONSOLIDADA' ? 'Consolidado' : 'Expectativa'
}

export function formatarValor(campo: Pick<CampoAuditoria, 'tipo' | 'valor' | 'excluido'>) {
  if (campo.excluido) return 'Excluído'
  if (!campo.valor) return 'Não informado'
  if (campo.tipo === 'percentual') {
    const numero = Number(campo.valor.replace(',', '.'))
    if (Number.isNaN(numero)) return campo.valor
    return `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  }
  if (campo.tipo === 'boletim') return BOLETINS[campo.valor] ?? campo.valor
  return campo.valor
}

export function ocupacaoResumo(resposta: RespostaAuditoria) {
  const taxa = resposta.campos.find((campo) => campo.tipo === 'percentual' && !campo.excluido && campo.valor)
  return taxa ? formatarValor(taxa) : '—'
}

export function validarCampo(campo: CampoAuditoria) {
  if (campo.excluido) return null
  if (campo.tipo === 'percentual') {
    if (!campo.valor?.trim()) return 'Informe a taxa ou exclua o campo'
    const numero = Number(campo.valor.replace(',', '.'))
    if (Number.isNaN(numero) || numero < 0 || numero > 100) return 'A taxa deve ficar entre 0 e 100'
  }
  if (campo.tipo === 'boletim' && !campo.valor) return 'Informe a preferência ou exclua o campo'
  if (campo.tipo === 'email' && campo.valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.valor)) {
    return 'Informe um e-mail válido'
  }
  return null
}

export function descreverAlteracao(antes: CampoAuditoria, depois: CampoAuditoria) {
  if (antes.excluido === depois.excluido && antes.valor === depois.valor) return null
  if (!antes.excluido && depois.excluido) {
    return { valorAnterior: formatarValor(antes), valorNovo: 'Excluído', acao: 'Campo excluído' }
  }
  if (antes.excluido && !depois.excluido) {
    return { valorAnterior: 'Excluído', valorNovo: formatarValor(depois), acao: 'Campo restaurado' }
  }
  return {
    valorAnterior: formatarValor(antes),
    valorNovo: formatarValor(depois),
    acao: 'Correção do administrador',
  }
}
