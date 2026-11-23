import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Marca from '../components/Marca'
import { ErroApi } from '../lib/api'
import { autenticar } from '../lib/auth'
import { gravarSessao, lerSessao } from '../lib/sessao'
import './Login.css'

type ErrosFormulario = {
  email?: string
  senha?: string
  geral?: string
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(email: string, senha: string): ErrosFormulario {
  const erros: ErrosFormulario = {}
  const emailLimpo = email.trim()

  if (!emailLimpo) erros.email = 'Informe o e-mail'
  else if (!EMAIL_VALIDO.test(emailLimpo)) erros.email = 'Informe um e-mail válido'
  if (!senha) erros.senha = 'Informe a senha'

  return erros
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<ErrosFormulario>({})
  const [enviando, setEnviando] = useState(false)
  const [recuperacao, setRecuperacao] = useState(false)

  if (lerSessao()) return <Navigate to="/auditoria" replace />

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validar(email, senha)
    setErros(encontrados)
    if (encontrados.email || encontrados.senha) return

    setEnviando(true)
    try {
      const sessao = await autenticar(email.trim(), senha)
      gravarSessao(sessao)
      navigate('/auditoria', { replace: true })
    } catch (erro) {
      if (erro instanceof ErroApi && erro.campos?.length) {
        const proximos: ErrosFormulario = {}
        for (const campo of erro.campos) {
          if (campo.campo === 'email' || campo.campo === 'senha') proximos[campo.campo] = campo.mensagem
        }
        setErros(proximos.email || proximos.senha ? proximos : { geral: erro.message })
      } else {
        const mensagem = erro instanceof ErroApi ? erro.message : 'Não foi possível entrar. Tente novamente.'
        setErros({ geral: mensagem })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-pagina">
      <section className="login-cartao" aria-labelledby="login-titulo">
        <div className="login-cabecalho">
          <Marca />
          <h1 id="login-titulo">Observatório Municipal de Turismo</h1>
          <p>Acesso ao Sistema</p>
        </div>

        {recuperacao ? (
          <div className="login-recuperacao">
            <p>A redefinição de senha é feita pelo administrador do sistema. Entre em contato com a equipe responsável.</p>
            <button type="button" className="login-botao" onClick={() => setRecuperacao(false)}>
              Voltar ao login
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={enviar} noValidate>
            <div className="login-campo">
              <label htmlFor="email">Matrícula ou E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="ex: operador@turismo.gov.br"
                value={email}
                disabled={enviando}
                aria-invalid={Boolean(erros.email)}
                aria-describedby={erros.email ? 'email-erro' : undefined}
                onChange={(evento) => {
                  setEmail(evento.target.value)
                  setErros((atual) => ({ ...atual, email: undefined, geral: undefined }))
                }}
              />
              {erros.email && (
                <p id="email-erro" className="login-erro-campo" role="alert">
                  {erros.email}
                </p>
              )}
            </div>

            <div className="login-campo">
              <div className="login-rotulo">
                <label htmlFor="senha">Senha</label>
                <button type="button" className="login-esqueceu" onClick={() => setRecuperacao(true)}>
                  Esqueceu?
                </button>
              </div>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                disabled={enviando}
                aria-invalid={Boolean(erros.senha)}
                aria-describedby={erros.senha ? 'senha-erro' : undefined}
                onChange={(evento) => {
                  setSenha(evento.target.value)
                  setErros((atual) => ({ ...atual, senha: undefined, geral: undefined }))
                }}
              />
              {erros.senha && (
                <p id="senha-erro" className="login-erro-campo" role="alert">
                  {erros.senha}
                </p>
              )}
            </div>

            {erros.geral && (
              <p className="login-erro" role="alert">
                {erros.geral}
              </p>
            )}

            <button type="submit" className="login-botao" disabled={enviando}>
              <IconeEntrar />
              {enviando ? 'Entrando…' : 'Entrar no Sistema'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

function IconeEntrar() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}
