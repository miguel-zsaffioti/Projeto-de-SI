import { useMemo, useState } from 'react';
import {
  FileText,
  Send,
  History,
  TrendingUp,
  Building2,
  Search,
  MapPin,
  Clock,
  Save,
  Rocket,
  Link2,
  Lock,
  Copy,
  Check,
  Eye,
  Info,
  Mail,
  MessageSquare,
  X,
  CheckCircle2,
  Sparkles,
  LineChart,
} from 'lucide-react';
import './Pesquisa.css';

type TipoPesquisa = 'consolidada' | 'expectativa';

interface Estabelecimento {
  id: string;
  sigla: string;
  nome: string;
  slug: string;
  token: string;
  cnpj: string;
  cidadeUf: string;
  categoria: string;
  responsavel: string;
  email: string;
  whatsapp: string;
  validado: boolean;
}

interface CicloOption {
  label: string;
  inicio: string;
  fim: string;
  prazo: string;
}

interface PesquisaAtiva {
  id: string;
  tipo: TipoPesquisa;
  estabelecimento: string;
  ciclo: string;
  vigencia: string;
  canais: string;
  status: 'Disparada' | 'Rascunho';
}

const ESTABELECIMENTOS: Estabelecimento[] = [
  {
    id: 'est-1',
    sigla: 'GH',
    nome: 'Grand Hotel Beira Mar',
    slug: 'grand-hotel-beira-mar',
    token: 'tk-98a47f2e10',
    cnpj: '14.882.390/0001-44',
    cidadeUf: 'Santos / SP',
    categoria: 'Resort Urbano',
    responsavel: 'Mariana Costa',
    email: 'contato@grandhotel.com.br',
    whatsapp: '(13) 98122-4500',
    validado: true,
  },
  {
    id: 'est-2',
    sigla: 'TH',
    nome: 'Thermas Park Resort & Spa',
    slug: 'thermas-park-resort-spa',
    token: 'tk-41c92b7a04',
    cnpj: '22.410.815/0001-09',
    cidadeUf: 'Olímpia / SP',
    categoria: 'Resort / Grande Porte',
    responsavel: 'Ricardo Almeida',
    email: 'gerencia@thermaspark.com.br',
    whatsapp: '(17) 99144-8820',
    validado: true,
  },
  {
    id: 'est-3',
    sigla: 'PV',
    nome: 'Pousada Vila das Palmeiras',
    slug: 'pousada-vila-das-palmeiras',
    token: 'tk-73e15d9c21',
    cnpj: '31.904.512/0001-72',
    cidadeUf: 'Olímpia / SP',
    categoria: 'Pousada & Meios Compactos',
    responsavel: 'Fernanda Oliveira',
    email: 'reservas@viladaspalmeiras.com.br',
    whatsapp: '(17) 99710-3315',
    validado: true,
  },
  {
    id: 'est-4',
    sigla: 'HC',
    nome: 'Hotel Central Executive',
    slug: 'hotel-central-executive',
    token: 'tk-55b80a1f88',
    cnpj: '09.128.440/0001-31',
    cidadeUf: 'São Carlos / SP',
    categoria: 'Hotel Convencional',
    responsavel: 'Carlos Eduardo Lima',
    email: 'adm@centralexecutive.com.br',
    whatsapp: '(16) 98109-6400',
    validado: true,
  },
];

const CATEGORIAS = [
  'Resort Urbano',
  'Resort / Grande Porte',
  'Hotel Convencional',
  'Pousada & Meios Compactos',
];

const CICLOS: CicloOption[] = [
  {
    label: 'Alta Temporada - Verão 2025',
    inicio: '2024-12-01',
    fim: '2025-01-31',
    prazo: '2025-02-05',
  },
  {
    label: 'Carnaval 2025',
    inicio: '2025-02-28',
    fim: '2025-03-05',
    prazo: '2025-03-10',
  },
  {
    label: 'Baixa Temporada - Inverno 2025',
    inicio: '2025-06-01',
    fim: '2025-07-31',
    prazo: '2025-08-05',
  },
  {
    label: 'Feriados Prolongados 2025',
    inicio: '2025-04-18',
    fim: '2025-04-21',
    prazo: '2025-04-25',
  },
];

const PESQUISAS_INICIAIS: PesquisaAtiva[] = [
  {
    id: 'pesq-1',
    tipo: 'consolidada',
    estabelecimento: 'Thermas Park Resort & Spa',
    ciclo: 'Alta Temporada - Verão 2025',
    vigencia: '01/12/2024 a 31/01/2025',
    canais: 'E-mail + WhatsApp',
    status: 'Disparada',
  },
  {
    id: 'pesq-2',
    tipo: 'expectativa',
    estabelecimento: 'Pousada Vila das Palmeiras',
    ciclo: 'Carnaval 2025',
    vigencia: '28/02/2025 a 05/03/2025',
    canais: 'E-mail',
    status: 'Disparada',
  },
];

function formatarDataBr(isoDate: string): string {
  if (!isoDate) return '--/--/----';
  const partes = isoDate.split('-');
  if (partes.length !== 3) return isoDate;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function calcularDiferencaDias(inicio: string, fim: string, inclusivo: boolean): number {
  if (!inicio || !fim) return 0;
  const d1 = new Date(`${inicio}T00:00:00`);
  const d2 = new Date(`${fim}T00:00:00`);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  const total = inclusivo ? diff + 1 : diff;
  return total > 0 ? total : 0;
}

export default function Pesquisa() {
  const [tipo, setTipo] = useState<TipoPesquisa>('consolidada');
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] =
    useState<Estabelecimento>(ESTABELECIMENTOS[0]);
  const [busca, setBusca] = useState<string>(ESTABELECIMENTOS[0].nome);
  const [mostrarSugestoes, setMostrarSugestoes] = useState<boolean>(false);
  const [categoria, setCategoria] = useState<string>(ESTABELECIMENTOS[0].categoria);

  const [ciclo, setCiclo] = useState<string>(CICLOS[0].label);
  const [dataInicio, setDataInicio] = useState<string>(CICLOS[0].inicio);
  const [dataFim, setDataFim] = useState<string>(CICLOS[0].fim);
  const [prazoLimite, setPrazoLimite] = useState<string>(CICLOS[0].prazo);

  const [enviarEmail, setEnviarEmail] = useState<boolean>(true);
  const [assuntoEmail, setAssuntoEmail] = useState<string>(
    '[Observatório de Turismo] Pesquisa Oficial de Ocupação - Resposta Solicitada'
  );
  const [enviarWhatsapp, setEnviarWhatsapp] = useState<boolean>(true);

  const [copiado, setCopiado] = useState<boolean>(false);
  const [modalAtivas, setModalAtivas] = useState<boolean>(false);
  const [modalPreview, setModalPreview] = useState<boolean>(false);
  const [pesquisasAtivas, setPesquisasAtivas] =
    useState<PesquisaAtiva[]>(PESQUISAS_INICIAIS);
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (mensagem: string) => {
    setToast(mensagem);
    setTimeout(() => {
      setToast((atual) => (atual === mensagem ? null : atual));
    }, 3200);
  };

  const sugestoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ESTABELECIMENTOS;
    return ESTABELECIMENTOS.filter(
      (est) =>
        est.nome.toLowerCase().includes(termo) ||
        est.cnpj.includes(termo) ||
        est.cidadeUf.toLowerCase().includes(termo)
    );
  }, [busca]);

  const duracaoDias = useMemo(
    () => calcularDiferencaDias(dataInicio, dataFim, true),
    [dataInicio, dataFim]
  );

  const toleranciaDias = useMemo(
    () => calcularDiferencaDias(dataFim, prazoLimite, false),
    [dataFim, prazoLimite]
  );

  const linkExclusivo = useMemo(
    () =>
      `https://observatorio.turismo.sp.gov.br/p/${estabelecimentoSelecionado.token}?hotel=${estabelecimentoSelecionado.slug}`,
    [estabelecimentoSelecionado]
  );

  const canaisResumo = useMemo(() => {
    if (enviarEmail && enviarWhatsapp) return 'E-mail + WhatsApp';
    if (enviarEmail) return 'E-mail';
    if (enviarWhatsapp) return 'WhatsApp';
    return 'Nenhum canal selecionado';
  }, [enviarEmail, enviarWhatsapp]);

  const selecionarEstabelecimento = (est: Estabelecimento) => {
    setEstabelecimentoSelecionado(est);
    setBusca(est.nome);
    setCategoria(est.categoria);
    setMostrarSugestoes(false);
  };

  const handleAlterarCiclo = (novoCiclo: string) => {
    setCiclo(novoCiclo);
    const encontrado = CICLOS.find((c) => c.label === novoCiclo);
    if (encontrado) {
      setDataInicio(encontrado.inicio);
      setDataFim(encontrado.fim);
      setPrazoLimite(encontrado.prazo);
    }
  };

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkExclusivo);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = linkExclusivo;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiado(true);
    mostrarToast('Link exclusivo copiado para a área de transferência.');
    setTimeout(() => setCopiado(false), 2000);
  };

  const registrarPesquisa = (status: 'Disparada' | 'Rascunho') => {
    if (status === 'Disparada' && !enviarEmail && !enviarWhatsapp) {
      mostrarToast('Selecione ao menos um canal de disparo automático.');
      return;
    }
    const nova: PesquisaAtiva = {
      id: `pesq-${Date.now()}`,
      tipo,
      estabelecimento: estabelecimentoSelecionado.nome,
      ciclo,
      vigencia: `${formatarDataBr(dataInicio)} a ${formatarDataBr(dataFim)}`,
      canais: canaisResumo,
      status,
    };
    setPesquisasAtivas((prev) => [nova, ...prev]);
    mostrarToast(
      status === 'Disparada'
        ? `Pesquisa criada e disparada para ${estabelecimentoSelecionado.nome}.`
        : 'Rascunho salvo com sucesso.'
    );
  };

  const handleCancelar = () => {
    setTipo('consolidada');
    selecionarEstabelecimento(ESTABELECIMENTOS[0]);
    handleAlterarCiclo(CICLOS[0].label);
    setEnviarEmail(true);
    setEnviarWhatsapp(true);
    setAssuntoEmail(
      '[Observatório de Turismo] Pesquisa Oficial de Ocupação - Resposta Solicitada'
    );
    mostrarToast('Formulário restaurado para os valores iniciais.');
  };

  return (
    <div className="pesquisa-page">
      <div className="pesquisa-container">
        <div className="pesquisa-header">
          <div className="pesquisa-header-info">
            <div className="pesquisa-kicker">
              <span>Gestão de Pesquisas</span>
              <span className="pesquisa-kicker-sep">•</span>
              <span className="pesquisa-kicker-destaque">Administração</span>
            </div>
            <h1 className="pesquisa-titulo">Criar e Configurar Nova Pesquisa</h1>
            <p className="pesquisa-subtitulo">
              Defina os parâmetros de coleta, tipologia, vigência, público-alvo e canais
              de disparo aos estabelecimentos hoteleiros cadastrados no Observatório.
            </p>
          </div>

          <div className="pesquisa-header-acoes">
            <button
              type="button"
              onClick={() => setModalAtivas(true)}
              className="pesquisa-btn pesquisa-btn-secundario"
            >
              <FileText size={14} />
              Ver Pesquisas Ativas
            </button>
            <button
              type="button"
              onClick={() => registrarPesquisa('Disparada')}
              className="pesquisa-btn pesquisa-btn-primario"
            >
              <Send size={14} />
              Salvar e Disparar Pesquisa
            </button>
          </div>
        </div>

        <section className="pesquisa-card">
          <div className="pesquisa-secao-topo">
            <div className="pesquisa-secao-titulo-grupo">
              <span className="pesquisa-passo-badge">1</span>
              <h2 className="pesquisa-secao-titulo">
                Tipo de Pesquisa e Natureza dos Dados
              </h2>
            </div>
            <span className="pesquisa-secao-tag">Metodologia Cadastral</span>
          </div>

          <div className="pesquisa-tipos-grid">
            <button
              type="button"
              onClick={() => setTipo('consolidada')}
              className={`pesquisa-tipo-card ${tipo === 'consolidada' ? 'ativo' : ''}`}
            >
              <div className="pesquisa-tipo-topo">
                <div className="pesquisa-tipo-titulo-linha">
                  <History size={16} />
                  <span className="pesquisa-tipo-titulo">Pesquisa Consolidada</span>
                </div>
                <span className="pesquisa-radio">
                  {tipo === 'consolidada' && <span className="pesquisa-radio-ponto" />}
                </span>
              </div>
              <p className="pesquisa-tipo-desc">
                Dados retroativos e consolidados de taxa de ocupação, diária média (ADR),
                RevPAR e fluxo de hóspedes de períodos já transcorridos e apurados.
              </p>
              <div className="pesquisa-tipo-finalidade">
                <LineChart size={14} />
                <span>Finalidade: Séries Históricas e Anuários</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipo('expectativa')}
              className={`pesquisa-tipo-card ${tipo === 'expectativa' ? 'ativo' : ''}`}
            >
              <div className="pesquisa-tipo-topo">
                <div className="pesquisa-tipo-titulo-linha">
                  <TrendingUp size={16} />
                  <span className="pesquisa-tipo-titulo">
                    Pesquisa de Expectativa / Projeção
                  </span>
                </div>
                <span className="pesquisa-radio">
                  {tipo === 'expectativa' && <span className="pesquisa-radio-ponto" />}
                </span>
              </div>
              <p className="pesquisa-tipo-desc">
                Estimativas prévias de ocupação hoteleira e intenção de reservas
                confirmadas para feriados prolongados, alta temporada ou eventos de grande
                porte.
              </p>
              <div className="pesquisa-tipo-finalidade pesquisa-tipo-finalidade-azul">
                <Sparkles size={14} />
                <span>Finalidade: Planejamento Operacional e Imprensa</span>
              </div>
            </button>
          </div>
        </section>

        <section className="pesquisa-card">
          <div className="pesquisa-secao-titulo-grupo">
            <span className="pesquisa-passo-badge">2</span>
            <h2 className="pesquisa-secao-titulo">
              Destinatários e Estabelecimentos Hoteleiros
            </h2>
          </div>

          <div className="pesquisa-alvo-box">
            <div className="pesquisa-alvo-titulo">
              <Building2 size={16} className="pesquisa-icone-azul" />
              <span>Configuração do Estabelecimento Alvo</span>
            </div>

            <div className="pesquisa-alvo-grid">
              <div className="pesquisa-campo">
                <label className="pesquisa-label">
                  Nome do Estabelecimento <span className="pesquisa-obrigatorio">*</span>
                </label>
                <div className="pesquisa-input-busca-wrap">
                  <Search size={15} className="pesquisa-input-busca-icone" />
                  <input
                    type="text"
                    value={busca}
                    onFocus={() => setMostrarSugestoes(true)}
                    onBlur={() => setTimeout(() => setMostrarSugestoes(false), 180)}
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setMostrarSugestoes(true);
                    }}
                    placeholder="Buscar por nome, CNPJ ou cidade..."
                    className="pesquisa-input pesquisa-input-busca"
                  />
                </div>

                {mostrarSugestoes && sugestoesFiltradas.length > 0 && (
                  <div className="pesquisa-sugestoes">
                    {sugestoesFiltradas.map((est) => (
                      <button
                        key={est.id}
                        type="button"
                        onMouseDown={() => selecionarEstabelecimento(est)}
                        className="pesquisa-sugestao-item"
                      >
                        <div>
                          <div className="pesquisa-sugestao-nome">{est.nome}</div>
                          <div className="pesquisa-sugestao-meta">
                            CNPJ: {est.cnpj} • {est.cidadeUf}
                          </div>
                        </div>
                        <span className="pesquisa-sugestao-cat">{est.categoria}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pesquisa-cnpj-linha">
                  <MapPin size={12} />
                  <span>CNPJ: {estabelecimentoSelecionado.cnpj}</span>
                </div>
              </div>

              <div className="pesquisa-campo">
                <label className="pesquisa-label">Categoria / Polo Regional</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="pesquisa-select"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pesquisa-estabelecimento-card">
              <div className="pesquisa-estabelecimento-id">
                <div className="pesquisa-estabelecimento-avatar">
                  {estabelecimentoSelecionado.sigla}
                </div>
                <div>
                  <div className="pesquisa-estabelecimento-nome-linha">
                    <span className="pesquisa-estabelecimento-nome">
                      {estabelecimentoSelecionado.nome}
                    </span>
                    {estabelecimentoSelecionado.validado && (
                      <span className="pesquisa-badge-validado">
                        Cadastrado e Validado
                      </span>
                    )}
                  </div>
                  <p className="pesquisa-estabelecimento-sub">
                    CNPJ: {estabelecimentoSelecionado.cnpj} •{' '}
                    {estabelecimentoSelecionado.cidadeUf}
                  </p>
                </div>
              </div>

              <div className="pesquisa-estabelecimento-contatos">
                <div>
                  <span className="pesquisa-contato-label">Responsável</span>
                  <span className="pesquisa-contato-valor">
                    {estabelecimentoSelecionado.responsavel}
                  </span>
                </div>
                <div>
                  <span className="pesquisa-contato-label">E-mail Notificação</span>
                  <span className="pesquisa-contato-valor">
                    {estabelecimentoSelecionado.email}
                  </span>
                </div>
                <div>
                  <span className="pesquisa-contato-label">WhatsApp Oficial</span>
                  <span className="pesquisa-contato-valor">
                    {estabelecimentoSelecionado.whatsapp}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pesquisa-bloco-interno">
            <div className="pesquisa-secao-topo">
              <div className="pesquisa-secao-titulo-grupo">
                <span className="pesquisa-passo-badge">3</span>
                <h2 className="pesquisa-secao-titulo">
                  Vigência e Definição de Períodos
                </h2>
              </div>
              <span className="pesquisa-secao-tag">Cronograma de Campo</span>
            </div>

            <div className="pesquisa-vigencia-grid">
              <div className="pesquisa-campo">
                <label className="pesquisa-label">
                  Período / Ciclo de Amostragem{' '}
                  <span className="pesquisa-obrigatorio">*</span>
                </label>
                <select
                  value={ciclo}
                  onChange={(e) => handleAlterarCiclo(e.target.value)}
                  className="pesquisa-select-soft"
                >
                  {CICLOS.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pesquisa-campo">
                <label className="pesquisa-label">
                  Data de Início <span className="pesquisa-obrigatorio">*</span>
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="pesquisa-input-soft"
                />
              </div>

              <div className="pesquisa-campo">
                <label className="pesquisa-label">
                  Data de Fim <span className="pesquisa-obrigatorio">*</span>
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="pesquisa-input-soft"
                />
              </div>

              <div className="pesquisa-campo">
                <label className="pesquisa-label">
                  Prazo Limite para Resposta{' '}
                  <span className="pesquisa-obrigatorio">*</span>
                </label>
                <input
                  type="date"
                  value={prazoLimite}
                  onChange={(e) => setPrazoLimite(e.target.value)}
                  className="pesquisa-input-soft"
                />
              </div>
            </div>

            <div className="pesquisa-duracao-barra">
              <div className="pesquisa-duracao-esquerda">
                <Clock size={14} />
                <span>
                  Duração: {duracaoDias} dias | Período de apuração integral
                </span>
              </div>
              <div className="pesquisa-duracao-direita">
                <span className="pesquisa-ponto-azul" />
                <span>
                  Janela de tolerância para fechamento: +{toleranciaDias} dias
                </span>
              </div>
            </div>
          </div>

          <div className="pesquisa-resumo-banner">
            <div className="pesquisa-resumo-info">
              <span className="pesquisa-resumo-kicker">Resumo da Configuração</span>
              <div className="pesquisa-resumo-linha">
                <span>
                  Tipo:{' '}
                  <strong className="destaque-azul">
                    {tipo === 'consolidada'
                      ? 'Consolidada (Realizado)'
                      : 'Expectativa / Projeção'}
                  </strong>
                </span>
                <span className="pesquisa-kicker-sep">•</span>
                <span>
                  Vigência:{' '}
                  <strong>
                    {formatarDataBr(dataInicio)} a {formatarDataBr(dataFim)}
                  </strong>
                </span>
              </div>
              <div className="pesquisa-resumo-linha">
                <span>
                  Estabelecimento: <strong>{estabelecimentoSelecionado.nome}</strong>
                </span>
                <span className="pesquisa-kicker-sep">•</span>
                <span>
                  Canais: <strong>{canaisResumo}</strong>
                </span>
              </div>
            </div>

            <div className="pesquisa-resumo-acoes">
              <button
                type="button"
                onClick={handleCancelar}
                className="pesquisa-btn pesquisa-btn-branco"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => registrarPesquisa('Rascunho')}
                className="pesquisa-btn pesquisa-btn-branco-escuro"
              >
                <Save size={14} className="pesquisa-icone-azul" />
                Salvar Rascunho
              </button>
              <button
                type="button"
                onClick={() => registrarPesquisa('Disparada')}
                className="pesquisa-btn pesquisa-btn-escuro"
              >
                <Rocket size={14} />
                Confirmar Criação e Disparar Pesquisa
              </button>
            </div>
          </div>

          <div className="pesquisa-bloco-interno">
            <div className="pesquisa-secao-topo">
              <div className="pesquisa-secao-titulo-grupo">
                <span className="pesquisa-passo-badge">4</span>
                <h2 className="pesquisa-secao-titulo">
                  Geração de Link Único e Canais de Disparo Automático
                </h2>
              </div>
              <span className="pesquisa-secao-tag">Distribuição Segura</span>
            </div>

            <div className="pesquisa-link-box">
              <div className="pesquisa-link-topo">
                <div className="pesquisa-link-titulo">
                  <Link2 size={14} className="pesquisa-icone-azul" />
                  <span>Link Exclusivo do Estabelecimento (Individual):</span>
                </div>
                <span className="pesquisa-link-badge">
                  Personalizado por Estabelecimento
                </span>
              </div>

              <div className="pesquisa-link-linha">
                <div className="pesquisa-link-input-wrap">
                  <Lock size={14} className="pesquisa-link-lock" />
                  <input
                    type="text"
                    readOnly
                    value={linkExclusivo}
                    className="pesquisa-link-input"
                  />
                </div>
                <div className="pesquisa-link-acoes">
                  <button
                    type="button"
                    onClick={handleCopiarLink}
                    className="pesquisa-btn pesquisa-btn-link"
                  >
                    {copiado ? (
                      <Check size={14} className="pesquisa-icone-sucesso" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copiado ? 'Copiado' : 'Copiar Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPreview(true)}
                    className="pesquisa-btn pesquisa-btn-link"
                  >
                    <Eye size={14} />
                    Testar Visualização
                  </button>
                </div>
              </div>

              <div className="pesquisa-link-nota">
                <Info size={14} />
                <span>
                  Cada link gerado possui identificador único vinculado ao cadastro do
                  hotel ({estabelecimentoSelecionado.nome}). Preenchimentos são atribuídos
                  automaticamente.
                </span>
              </div>
            </div>

            <div className="pesquisa-canais-bloco">
              <span className="pesquisa-canais-titulo">
                Selecione os Canais de Disparo Automático:
              </span>

              <div className="pesquisa-canal-card">
                <label className="pesquisa-checkbox-label">
                  <input
                    type="checkbox"
                    checked={enviarEmail}
                    onChange={(e) => setEnviarEmail(e.target.checked)}
                    className="pesquisa-checkbox"
                  />
                  <Mail size={15} className="pesquisa-icone-azul" />
                  <span>Enviar por E-mail Institucional</span>
                </label>

                <div className="pesquisa-assunto-linha">
                  <span className="pesquisa-assunto-label">Assunto Padrão:</span>
                  <input
                    type="text"
                    disabled={!enviarEmail}
                    value={assuntoEmail}
                    onChange={(e) => setAssuntoEmail(e.target.value)}
                    className="pesquisa-assunto-input"
                  />
                </div>
              </div>

              <div className="pesquisa-canal-card">
                <label className="pesquisa-checkbox-label">
                  <input
                    type="checkbox"
                    checked={enviarWhatsapp}
                    onChange={(e) => setEnviarWhatsapp(e.target.checked)}
                    className="pesquisa-checkbox"
                  />
                  <MessageSquare size={15} className="pesquisa-icone-azul" />
                  <span>Enviar por WhatsApp Oficial</span>
                </label>
                <p className="pesquisa-canal-desc">
                  Dispara mensagem template HSM aprovada contendo o link direto de
                  preenchimento e data limite aos contatos dos gerentes gerais.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {modalAtivas && (
        <div className="pesquisa-modal-overlay">
          <div className="pesquisa-modal">
            <div className="pesquisa-modal-topo">
              <div>
                <h3 className="pesquisa-modal-titulo">Pesquisas Ativas</h3>
                <p className="pesquisa-modal-sub">
                  Coletas disparadas e rascunhos salvos no Observatório
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAtivas(false)}
                className="pesquisa-modal-fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pesquisa-ativas-lista">
              {pesquisasAtivas.map((item) => (
                <div key={item.id} className="pesquisa-ativa-item">
                  <div>
                    <div className="pesquisa-ativa-topo">
                      <span className="pesquisa-ativa-nome">{item.estabelecimento}</span>
                      <span
                        className={`pesquisa-status-badge ${
                          item.status === 'Disparada'
                            ? 'pesquisa-status-disparada'
                            : 'pesquisa-status-rascunho'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="pesquisa-ativa-meta">
                      {item.ciclo} • {item.vigencia} • {item.canais}
                    </p>
                  </div>
                  <span className="pesquisa-ativa-tipo">
                    {item.tipo === 'consolidada' ? 'Consolidada' : 'Expectativa'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalPreview && (
        <div className="pesquisa-modal-overlay">
          <div className="pesquisa-modal pesquisa-modal-pequeno">
            <div className="pesquisa-modal-topo">
              <div>
                <span className="pesquisa-modal-kicker">
                  Pré-visualização do Respondente
                </span>
                <h3 className="pesquisa-modal-titulo">
                  {estabelecimentoSelecionado.nome}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPreview(false)}
                className="pesquisa-modal-fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pesquisa-preview-box">
              <p>
                <strong>Tipo:</strong>{' '}
                {tipo === 'consolidada'
                  ? 'Pesquisa Consolidada'
                  : 'Pesquisa de Expectativa / Projeção'}
              </p>
              <p>
                <strong>Ciclo:</strong> {ciclo}
              </p>
              <p>
                <strong>Vigência:</strong> {formatarDataBr(dataInicio)} a{' '}
                {formatarDataBr(dataFim)}
              </p>
              <p>
                <strong>Prazo Limite:</strong> {formatarDataBr(prazoLimite)}
              </p>
              <p className="pesquisa-preview-url">{linkExclusivo}</p>
            </div>

            <div className="pesquisa-modal-rodape">
              <button
                type="button"
                onClick={() => setModalPreview(false)}
                className="pesquisa-btn pesquisa-btn-primario"
              >
                Fechar Pré-visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pesquisa-toast">
          <CheckCircle2 size={16} className="pesquisa-toast-icone" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}