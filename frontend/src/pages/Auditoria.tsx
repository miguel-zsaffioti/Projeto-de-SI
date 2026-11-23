import { useMemo, useState } from 'react'
import {
  descreverAlteracao,
  formatarValor,
  historicoInicial,
  ocupacaoResumo,
  respostasIniciais,
  rotuloPesquisa,
  validarCampo,
  type CampoAuditoria,
  type RegistroHistorico,
  type RespostaAuditoria,
  type TipoPesquisaTela,
} from '../dados/auditoria'
import { lerSessao } from '../lib/sessao'
import './Auditoria.css'

type FiltroPesquisa = 'TODAS' | TipoPesquisaTela
type FiltroStatus = 'TODOS' | 'COMPLETA' | 'EXCLUIDO'

const BOLETINS = [
  { valor: 'NAO_QUERO', rotulo: 'Não quero receber' },
  { valor: 'WHATSAPP', rotulo: 'WhatsApp' },
  { valor: 'EMAIL', rotulo: 'E-mail' },
  { valor: 'OUTRO', rotulo: 'Outro' },
]

function clonar(respostas: RespostaAuditoria[]) {
  return respostas.map((resposta) => ({ ...resposta, campos: resposta.campos.map((campo) => ({ ...campo })) }))
}

function visiveis(lista: RespostaAuditoria[], pesquisa: FiltroPesquisa, status: FiltroStatus) {
  return lista.filter((resposta) => {
    if (pesquisa !== 'TODAS' && resposta.pesquisa !== pesquisa) return false
    const temExcluido = resposta.campos.some((campo) => campo.excluido)
    if (status === 'COMPLETA' && temExcluido) return false
    if (status === 'EXCLUIDO' && !temExcluido) return false
    return true
  })
}

function houveMudanca(antes: RespostaAuditoria, depois: RespostaAuditoria) {
  return antes.campos.some((campo, indice) => {
    const atual = depois.campos[indice]
    return campo.valor !== atual.valor || campo.excluido !== atual.excluido
  })
}

function formatarAgora() {
  const agora = new Date()
  const dia = agora.toLocaleDateString('pt-BR')
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dia} às ${hora}`
}

export default function Auditoria() {
  const administrador = lerSessao()?.administrador
  const [salvas, setSalvas] = useState(() => clonar(respostasIniciais))
  const [rascunhos, setRascunhos] = useState(() => clonar(respostasIniciais))
  const [selecionadaId, setSelecionadaId] = useState(respostasIniciais[0].id)
  const [historico, setHistorico] = useState<RegistroHistorico[]>(historicoInicial)
  const [pesquisaPendente, setPesquisaPendente] = useState<FiltroPesquisa>('TODAS')
  const [statusPendente, setStatusPendente] = useState<FiltroStatus>('TODOS')
  const [pesquisaFiltro, setPesquisaFiltro] = useState<FiltroPesquisa>('TODAS')
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>('TODOS')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<string | null>(null)

  const lista = useMemo(() => visiveis(salvas, pesquisaFiltro, statusFiltro), [salvas, pesquisaFiltro, statusFiltro])
  const salva = salvas.find((resposta) => resposta.id === selecionadaId) ?? null
  const rascunho = rascunhos.find((resposta) => resposta.id === selecionadaId) ?? null
  const sujo = salva && rascunho ? houveMudanca(salva, rascunho) : false

  function selecionar(id: string) {
    setSelecionadaId(id)
    setEditandoId(null)
    setErros({})
    setMensagem(null)
  }

  function aplicarFiltros() {
    const proximas = visiveis(salvas, pesquisaPendente, statusPendente)
    setPesquisaFiltro(pesquisaPendente)
    setStatusFiltro(statusPendente)
    if (!proximas.some((resposta) => resposta.id === selecionadaId)) {
      selecionar(proximas[0]?.id ?? '')
    }
  }

  function atualizarCampo(campoId: string, parcial: Partial<CampoAuditoria>) {
    setRascunhos((atual) =>
      atual.map((resposta) => {
        if (resposta.id !== selecionadaId) return resposta
        return {
          ...resposta,
          campos: resposta.campos.map((campo) => (campo.id === campoId ? { ...campo, ...parcial } : campo)),
        }
      }),
    )
    setErros((atual) => {
      const proximo = { ...atual }
      delete proximo[campoId]
      return proximo
    })
    setMensagem(null)
  }

  function cancelar() {
    if (!salva) return
    setRascunhos((atual) => atual.map((resposta) => (resposta.id === salva.id ? clonar([salva])[0] : resposta)))
    setEditandoId(null)
    setErros({})
    setMensagem(null)
  }

  function salvar() {
    if (!salva || !rascunho) return
    const encontrados: Record<string, string> = {}
    rascunho.campos.forEach((campo) => {
      const erro = validarCampo(campo)
      if (erro) encontrados[campo.id] = erro
    })
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0 || !sujo) return

    const entradas = rascunho.campos.flatMap((campo, indice) => {
      const mudanca = descreverAlteracao(salva.campos[indice], campo)
      if (!mudanca) return []
      const registro: RegistroHistorico = {
        id: `h-${campo.id}-${Date.now()}`,
        quando: formatarAgora(),
        usuario: administrador?.nome ?? 'Administrador',
        papel: 'Coordenação',
        respostaId: rascunho.id,
        estabelecimento: rascunho.estabelecimento,
        campo: campo.rotulo,
        ...mudanca,
      }
      return [registro]
    })

    const confirmada = clonar([rascunho])[0]
    setSalvas((atual) => atual.map((resposta) => (resposta.id === confirmada.id ? confirmada : resposta)))
    setRascunhos((atual) => atual.map((resposta) => (resposta.id === confirmada.id ? clonar([confirmada])[0] : resposta)))
    setHistorico((atual) => [...entradas.reverse(), ...atual])
    setEditandoId(null)
    setMensagem('Alterações salvas. O histórico registrou quem alterou, quando e o valor anterior.')
  }

  return (
    <section className="auditoria">
      <div className="auditoria-topo">
        <h1>Auditoria de Registros</h1>
        <form
          className="auditoria-filtros"
          onSubmit={(evento) => {
            evento.preventDefault()
            aplicarFiltros()
          }}
        >
          <select
            aria-label="Pesquisa"
            value={pesquisaPendente}
            onChange={(evento) => setPesquisaPendente(evento.target.value as FiltroPesquisa)}
          >
            <option value="TODAS">Pesquisa (Todas)</option>
            <option value="CONSOLIDADA">Consolidado</option>
            <option value="EXPECTATIVA">Expectativa</option>
          </select>
          <select
            aria-label="Status"
            value={statusPendente}
            onChange={(evento) => setStatusPendente(evento.target.value as FiltroStatus)}
          >
            <option value="TODOS">Status (Todos)</option>
            <option value="COMPLETA">Completa</option>
            <option value="EXCLUIDO">Com campo excluído</option>
          </select>
          <button type="submit" className="auditoria-filtrar">
            <IconeFiltro />
            Filtrar
          </button>
        </form>
      </div>

      <div className="auditoria-grade">
        <article className="cartao">
          <header className="cartao-topo">
            <h2>Respostas recebidas</h2>
            <span>
              {lista.length} {lista.length === 1 ? 'registro listado' : 'registros listados'}
            </span>
          </header>
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Estabelecimento</th>
                  <th>Pesquisa</th>
                  <th>Ocupação</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="tabela-vazia">
                      Nenhuma resposta com esses filtros.
                    </td>
                  </tr>
                ) : (
                  lista.map((resposta) => {
                    const ativa = resposta.id === selecionadaId
                    return (
                      <tr key={resposta.id} className={ativa ? 'linha-ativa' : undefined} onClick={() => selecionar(resposta.id)}>
                        <td className="id">#{resposta.id}</td>
                        <td>{resposta.estabelecimento}</td>
                        <td>{rotuloPesquisa(resposta.pesquisa)}</td>
                        <td className="ocupacao">{ocupacaoResumo(resposta)}</td>
                        <td className="acao">
                          {ativa ? (
                            <span className="acao-selecionado">Selecionado</span>
                          ) : (
                            <button type="button" className="acao-ver" onClick={() => selecionar(resposta.id)}>
                              Ver campos
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="cartao editor" aria-live="polite">
          {rascunho ? (
            <>
              <header className="cartao-topo editor-topo">
                <div>
                  <h2>Edição de Campos • Registro #{rascunho.id}</h2>
                  <p>
                    {rascunho.estabelecimento} • {rotuloPesquisa(rascunho.pesquisa)}
                  </p>
                </div>
              </header>
              <p className="editor-ajuda">Edite ou exclua campos específicos sem invalidar a resposta inteira.</p>
              <div className="editor-campos">
                {rascunho.campos.map((campo) => (
                  <CampoLinha
                    key={campo.id}
                    campo={campo}
                    editando={editandoId === campo.id}
                    erro={erros[campo.id]}
                    onEditar={() => setEditandoId(campo.id)}
                    onMudar={(valor) => atualizarCampo(campo.id, { valor })}
                    onExcluir={() => {
                      atualizarCampo(campo.id, { excluido: true })
                      setEditandoId(null)
                    }}
                    onRestaurar={() => atualizarCampo(campo.id, { excluido: false })}
                    onConcluir={() => setEditandoId(null)}
                  />
                ))}
              </div>
              {mensagem && <p className="editor-mensagem">{mensagem}</p>}
              <div className="editor-acoes">
                <button type="button" className="botao-cancelar" onClick={cancelar}>
                  Cancelar
                </button>
                <button type="button" className="botao-salvar" onClick={salvar}>
                  Salvar Alterações
                </button>
              </div>
            </>
          ) : (
            <p className="editor-vazio">Selecione uma resposta para corrigir um campo.</p>
          )}
        </article>
      </div>

      <article className="cartao historico">
        <header className="cartao-topo">
          <div className="historico-titulo">
            <IconeRelogio />
            <div>
              <h2>Histórico de Alterações</h2>
              <p>Quem alterou, quando e o valor anterior de cada campo.</p>
            </div>
          </div>
          <span>
            {historico.length} {historico.length === 1 ? 'registro recente' : 'registros recentes'}
          </span>
        </header>
        <div className="tabela-rolagem">
          <table className="tabela historico-tabela">
            <thead>
              <tr>
                <th>Data / hora</th>
                <th>Usuário / responsável</th>
                <th>Registro / estabelecimento</th>
                <th>Campo modificado</th>
                <th>Valor anterior</th>
                <th>Novo valor</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((registro) => (
                <tr key={registro.id}>
                  <td>{registro.quando}</td>
                  <td>
                    <strong>{registro.usuario}</strong>
                    <small>{registro.papel}</small>
                  </td>
                  <td>
                    {registro.estabelecimento} <span className="id">(#{registro.respostaId})</span>
                  </td>
                  <td>{registro.campo}</td>
                  <td className="valor-anterior">{registro.valorAnterior}</td>
                  <td className="valor-novo">{registro.valorNovo}</td>
                  <td>
                    <span className="acao-pill">{registro.acao}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

type CampoLinhaProps = {
  campo: CampoAuditoria
  editando: boolean
  erro?: string
  onEditar: () => void
  onMudar: (valor: string) => void
  onExcluir: () => void
  onRestaurar: () => void
  onConcluir: () => void
}

function CampoLinha({ campo, editando, erro, onEditar, onMudar, onExcluir, onRestaurar, onConcluir }: CampoLinhaProps) {
  return (
    <div className={campo.excluido ? 'campo excluido' : 'campo'}>
      <div className="campo-info">
        <span className="campo-rotulo">{campo.rotulo}</span>
        {campo.excluido ? (
          <strong className="campo-anulado">[Campo anulado / excluído]</strong>
        ) : editando ? (
          <EditorCampo campo={campo} onMudar={onMudar} onConcluir={onConcluir} />
        ) : (
          <strong className={campo.valor ? undefined : 'campo-vazio'}>{formatarValor({ ...campo, excluido: false })}</strong>
        )}
        {erro && (
          <p className="campo-erro" role="alert">
            {erro}
          </p>
        )}
      </div>
      <div className="campo-acoes">
        {campo.excluido ? (
          <button type="button" className="campo-restaurar" onClick={onRestaurar}>
            <IconeRestaurar />
            Restaurar campo
          </button>
        ) : (
          <>
            {!editando && (
              <button type="button" className="campo-editar" onClick={onEditar}>
                Editar
              </button>
            )}
            <button type="button" className="campo-excluir" onClick={onExcluir}>
              Excluir campo
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function EditorCampo({
  campo,
  onMudar,
  onConcluir,
}: {
  campo: CampoAuditoria
  onMudar: (valor: string) => void
  onConcluir: () => void
}) {
  if (campo.tipo === 'boletim') {
    return (
      <select
        aria-label={campo.rotulo}
        value={campo.valor ?? 'EMAIL'}
        autoFocus
        onChange={(evento) => onMudar(evento.target.value)}
        onBlur={onConcluir}
      >
        {BOLETINS.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      aria-label={campo.rotulo}
      className={campo.tipo === 'email' ? 'email' : undefined}
      inputMode={campo.tipo === 'percentual' ? 'decimal' : 'email'}
      value={campo.valor ?? ''}
      autoFocus
      onChange={(evento) => onMudar(evento.target.value)}
      onBlur={onConcluir}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') onConcluir()
      }}
    />
  )
}

function IconeFiltro() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5h16l-6 7.2V19l-4-2v-4.8L4 5z" strokeLinejoin="round" />
    </svg>
  )
}

function IconeRelogio() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconeRestaurar() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.3-5.6" strokeLinecap="round" />
      <path d="M4 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
