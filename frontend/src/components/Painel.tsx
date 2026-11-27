import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Marca from './Marca'
import { encerrarSessao, lerSessao } from '../lib/sessao'
import './Painel.css'

const ITENS = [
  { rotulo: 'Auditoria de Registros', href: '/auditoria', linhas: ['Auditoria de', 'Registros'] },
  { rotulo: 'Respostas dos Estabelecimentos', href: '/respostas', linhas: ['Respostas dos', 'Estabelecimentos'] },
  { rotulo: 'Indicadores', href: '/indicadores', linhas: ['Indicadores'] },
  { rotulo: 'Nova Pesquisa', href: '/nova-pesquisa', linhas: ['Nova', 'Pesquisa'] },
  { rotulo: 'Parâmetros e Fórmulas', href: '/parametros-e-formulas', linhas: ['Parâmetros e', 'Fórmulas'] },
]

type PainelProps = {
  children: ReactNode
}

export default function Painel({ children }: PainelProps) {
  const navigate = useNavigate()
  const administrador = lerSessao()?.administrador
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const primeiroNome = administrador?.nome.split(' ')[0] ?? 'Admin'

  useEffect(() => {
    if (!menuAberto) return
    function fechar(evento: MouseEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) setMenuAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [menuAberto])

  function sair() {
    encerrarSessao()
    navigate('/login', { replace: true })
  }

  return (
    <div className="painel">
      <header className="painel-barra">
        <div className="painel-marca">
          <Marca tamanho={34} />
          <strong>
            Observatório
            <br />
            de Turismo
          </strong>
          <span className="painel-perfil">Administrador</span>
        </div>

        <nav className="painel-nav" aria-label="Módulos">
          {ITENS.map((item) =>
            item.href ? (
              <NavLink
                key={item.rotulo}
                to={item.href}
                className={({ isActive }) => `painel-item${isActive ? ' ativo' : ''}`}
              >
                {item.linhas.map((linha) => (
                  <span key={linha}>{linha}</span>
                ))}
              </NavLink>
            ) : (
              <button key={item.rotulo} type="button" className="painel-item" aria-disabled="true">
                {item.linhas.map((linha) => (
                  <span key={linha}>{linha}</span>
                ))}
              </button>
            ),
          )}
        </nav>

        <div className="painel-usuario" ref={menuRef}>
          <span className="painel-usuario-texto">
            <strong>{primeiroNome}</strong>
            <span>Coordenação</span>
          </span>
          <button
            type="button"
            className="painel-avatar"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            aria-label={`Conta de ${administrador?.nome ?? 'administrador'}`}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <IconePessoa />
          </button>
          {menuAberto && (
            <div className="painel-menu" role="menu">
              <button type="button" role="menuitem" onClick={sair}>
                Sair
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="painel-conteudo">{children}</main>
    </div>
  )
}

function IconePessoa() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.4-2.6 3.7-3.9 6.5-3.9s5.1 1.3 6.5 3.9" strokeLinecap="round" />
    </svg>
  )
}
