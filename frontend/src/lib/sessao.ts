const CHAVE = 'oto.sessao'

export type Administrador = {
  id: string
  nome: string
  email: string
}

export type Sessao = {
  token: string
  administrador: Administrador
}

export function lerSessao(): Sessao | null {
  const bruto = localStorage.getItem(CHAVE)
  if (!bruto) return null

  try {
    const sessao = JSON.parse(bruto) as Sessao
    if (!sessao.token || !sessao.administrador?.email) return null
    return sessao
  } catch {
    return null
  }
}

export function gravarSessao(sessao: Sessao) {
  localStorage.setItem(CHAVE, JSON.stringify(sessao))
}

export function encerrarSessao() {
  localStorage.removeItem(CHAVE)
}
