import { api } from './api'
import type { Administrador, Sessao } from './sessao'

export function autenticar(email: string, senha: string) {
  return api<Sessao>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  })
}

export function buscarAdministrador(token: string) {
  return api<Administrador>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
