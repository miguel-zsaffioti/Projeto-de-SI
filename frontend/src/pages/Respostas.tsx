import { useMemo, useState } from 'react'
import {
  TAMANHO_PAGINA,
  baixarCsv,
  convitesTela,
  filtrarConvites,
  formatarDataHora,
  montarCsv,
  percentual,
  pesquisasTela,
} from '../dados/respostas'
import './Respostas.css'

export default function Respostas() {
  const [pesquisaId, setPesquisaId] = useState(pesquisasTela[0].id)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)

  const pesquisa = pesquisasTela.find((item) => item.id === pesquisaId) ?? pesquisasTela[0]
  const daPesquisa = useMemo(() => convitesTela.filter((convite) => convite.pesquisaId === pesquisaId), [pesquisaId])
  const filtrados = useMemo(() => filtrarConvites(convitesTela, pesquisaId, busca), [pesquisaId, busca])
  const total = daPesquisa.length
  const responderam = daPesquisa.filter((convite) => convite.status === 'RESPONDIDO').length
  const pendentes = total - responderam
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANHO_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * TAMANHO_PAGINA
  const paginaItens = filtrados.slice(inicio, inicio + TAMANHO_PAGINA)

  function escolherPesquisa(id: string) {
    setPesquisaId(id)
    setPagina(1)
  }

  function buscar(valor: string) {
    setBusca(valor)
    setPagina(1)
  }

  function exportar() {
    const nome = pesquisa.nome.toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
    baixarCsv(montarCsv(filtrados, pesquisa.nome), `respostas-${nome}.csv`)
  }

  return (
    <section className="respostas">
      <header className="respostas-topo">
        <div>
          <h1>Respostas dos Estabelecimentos</h1>
          <p>Controle direto de estabelecimentos que responderam ou estão pendentes na pesquisa selecionada.</p>
        </div>
        <button type="button" className="respostas-exportar" onClick={exportar}>
          <IconeBaixar />
          Exportar (.csv)
        </button>
      </header>

      <form className="respostas-filtros" onSubmit={(evento) => evento.preventDefault()}>
        <label>
          Pesquisa / ciclo
          <select aria-label="Pesquisa / ciclo" value={pesquisaId} onChange={(evento) => escolherPesquisa(evento.target.value)}>
            {pesquisasTela.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Buscar estabelecimento
          <span className="respostas-busca">
            <IconeBusca />
            <input
              type="search"
              placeholder="Filtrar por nome..."
              value={busca}
              onChange={(evento) => buscar(evento.target.value)}
            />
          </span>
        </label>
      </form>

      <div className="respostas-metricas">
        <article>
          <span>Total de estabelecimentos</span>
          <strong>{total}</strong>
          <small>Base convocada para a coleta</small>
        </article>
        <article className="metrica-responderam">
          <span>Responderam</span>
          <strong>
            {responderam} ({percentual(responderam, total)}%)
          </strong>
          <small>Respostas concluídas e validadas</small>
        </article>
        <article className="metrica-pendentes">
          <span>Não responderam / pendentes</span>
          <strong>
            {pendentes} ({percentual(pendentes, total)}%)
          </strong>
          <small>Aguardando submissão do formulário</small>
        </article>
      </div>

      <article className="respostas-lista">
        <header>
          <h2>Relação de Respostas</h2>
          <span>
            Exibindo {paginaItens.length} de {filtrados.length}{' '}
            {filtrados.length === 1 ? 'estabelecimento' : 'estabelecimentos'}
          </span>
        </header>
        <div className="respostas-rolagem">
          <table>
            <thead>
              <tr>
                <th>Estabelecimento</th>
                <th>Data e hora da resposta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginaItens.length === 0 ? (
                <tr>
                  <td colSpan={3} className="respostas-vazio">
                    Nenhum estabelecimento encontrado.
                  </td>
                </tr>
              ) : (
                paginaItens.map((convite) => (
                  <tr key={convite.id}>
                    <td>{convite.estabelecimento}</td>
                    <td>{convite.respondidoEm ? formatarDataHora(convite.respondidoEm) : '—'}</td>
                    <td>
                      <span className={convite.status === 'RESPONDIDO' ? 'status respondido' : 'status pendente'}>
                        {convite.status === 'RESPONDIDO' ? 'Respondido' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="respostas-paginacao">
          <span>
            Página {filtrados.length === 0 ? 0 : paginaAtual} de {filtrados.length === 0 ? 0 : totalPaginas}
          </span>
          <div>
            <button type="button" onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual <= 1}>
              Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map((numero) => (
              <button
                key={numero}
                type="button"
                className={numero === paginaAtual ? 'atual' : undefined}
                aria-current={numero === paginaAtual ? 'page' : undefined}
                onClick={() => setPagina(numero)}
                disabled={filtrados.length === 0}
              >
                {numero}
              </button>
            ))}
            <button type="button" onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual >= totalPaginas || filtrados.length === 0}>
              Próximo
            </button>
          </div>
        </footer>
      </article>
    </section>
  )
}

function IconeBaixar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4v10" strokeLinecap="round" />
      <path d="M8 10.5 12 14.5 16 10.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.5h14" strokeLinecap="round" />
    </svg>
  )
}

function IconeBusca() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16.5 20 20.5" strokeLinecap="round" />
    </svg>
  )
}
