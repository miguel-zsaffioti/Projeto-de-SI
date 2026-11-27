import React, { useMemo, useState } from 'react';
import {
  Building2,
  Lock,
  User,
  ClipboardCheck,
  BedDouble,
  Briefcase,
  Info,
  TrendingUp,
  Plus,
  Trash2,
  CalendarCheck,
  MessageSquare,
  Mail,
  Save,
  Send,
  CheckCircle2,
} from 'lucide-react';
import './RespostaPesquisa.css';

type CanalBoletim = 'nenhum' | 'whatsapp' | 'email';

interface Subperiodo {
  id: string;
  codigo: string;
  janela: string;
  contexto: string;
  destaque?: boolean;
  ocupacao: number;
}

interface FeriadoProjecao {
  id: string;
  nome: string;
  janela: string;
  ocupacaoEsperada: number;
}

const SUBPERIODOS_INICIAIS: Subperiodo[] = [
  {
    id: 'p1',
    codigo: 'PERÍODO 1',
    janela: '01/12 a 15/12',
    contexto: 'Abertura de Temporada',
    ocupacao: 72,
  },
  {
    id: 'p2',
    codigo: 'PERÍODO 2',
    janela: '16/12 a 31/12',
    contexto: 'Natal / Réveillon (Alta Estação)',
    destaque: true,
    ocupacao: 95,
  },
  {
    id: 'p3',
    codigo: 'PERÍODO 3',
    janela: '01/01 a 15/01',
    contexto: 'Férias Escolares 1ª Quinzena',
    ocupacao: 84,
  },
  {
    id: 'p4',
    codigo: 'PERÍODO 4',
    janela: '16/01 a 31/01',
    contexto: 'Férias Escolares 2ª Quinzena',
    ocupacao: 76,
  },
];

const FERIADOS_INICIAIS: FeriadoProjecao[] = [
  {
    id: 'fer-1',
    nome: 'Carnaval (Fevereiro)',
    janela: '01/03 a 05/03/2025',
    ocupacaoEsperada: 88,
  },
  {
    id: 'fer-2',
    nome: 'Semana Santa / Páscoa',
    janela: '18/04 a 21/04/2025',
    ocupacaoEsperada: 75,
  },
];

export default function RespostaPesquisa() {
  const [nomeFantasia, setNomeFantasia] = useState<string>('Grand Hotel Beira Mar');
  const [responsavelCargo, setResponsavelCargo] = useState<string>('Gerente Operacional');
  const [ocupacaoGeral, setOcupacaoGeral] = useState<number>(78);
  const [subperiodos, setSubperiodos] = useState<Subperiodo[]>(SUBPERIODOS_INICIAIS);
  const [feriados, setFeriados] = useState<FeriadoProjecao[]>(FERIADOS_INICIAIS);

  const [quantidadeReservas, setQuantidadeReservas] = useState<number>(580);
  const [valorMedioDiaria, setValorMedioDiaria] = useState<string>('390,00');
  const [leitosLivres, setLeitosLivres] = useState<number>(42);

  const [canalBoletim, setCanalBoletim] = useState<CanalBoletim>('whatsapp');
  const [whatsapp, setWhatsapp] = useState<string>('(13) 99124-8833');
  const [emailBoletim, setEmailBoletim] = useState<string>('contato@grandhotel.com.br');

  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (mensagem: string) => {
    setToast(mensagem);
    window.setTimeout(() => {
      setToast((atual) => (atual === mensagem ? null : atual));
    }, 3200);
  };

  const mediaSubperiodos = useMemo(() => {
    if (subperiodos.length === 0) return 0;
    const soma = subperiodos.reduce((acc, item) => acc + item.ocupacao, 0);
    return soma / subperiodos.length;
  }, [subperiodos]);

  const picoSubperiodo = useMemo(() => {
    return subperiodos.reduce(
      (maior, atual) => (atual.ocupacao > maior.ocupacao ? atual : maior),
      subperiodos[0]
    );
  }, [subperiodos]);

  const pontosSparkline = useMemo(() => {
    const valores = [
      Math.max(0, ocupacaoGeral - 4),
      ...subperiodos.map((s) => s.ocupacao),
    ];
    const largura = 220;
    const altura = 38;
    const padX = 8;
    const padY = 6;
    const passo = (largura - padX * 2) / (valores.length - 1);

    return valores.map((v, idx) => {
      const clamped = Math.min(100, Math.max(0, v));
      const x = padX + idx * passo;
      const y = altura - padY - (clamped / 100) * (altura - padY * 2);
      return { x, y };
    });
  }, [ocupacaoGeral, subperiodos]);

  const polylinePoints = useMemo(
    () => pontosSparkline.map((p) => `${p.x},${p.y}`).join(' '),
    [pontosSparkline]
  );

  const atualizarSubperiodo = (id: string, valor: number) => {
    const limitado = Math.min(100, Math.max(0, Number.isNaN(valor) ? 0 : valor));
    setSubperiodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ocupacao: limitado } : item))
    );
  };

  const atualizarFeriado = (
    id: string,
    campo: keyof FeriadoProjecao,
    valor: string | number
  ) => {
    setFeriados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const adicionarFeriado = () => {
    const novo: FeriadoProjecao = {
      id: `fer-${Date.now()}`,
      nome: '',
      janela: '',
      ocupacaoEsperada: 0,
    };
    setFeriados((prev) => [...prev, novo]);
  };

  const removerFeriado = (id: string) => {
    setFeriados((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSalvarRascunho = () => {
    mostrarToast('Rascunho salvo com sucesso. Você pode continuar depois.');
  };

  const handleEnviarResposta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFantasia.trim()) {
      mostrarToast('Informe o Nome Fantasia do Estabelecimento.');
      return;
    }
    if (canalBoletim === 'whatsapp' && !whatsapp.trim()) {
      mostrarToast('Informe o número de WhatsApp com DDD para receber o boletim.');
      return;
    }
    if (canalBoletim === 'email' && !emailBoletim.trim()) {
      mostrarToast('Informe o e-mail para receber o boletim.');
      return;
    }
    mostrarToast('Resposta oficial enviada e protocolada sob o código COL-2024-8842.');
  };

  return (
    <div className="resposta-page">
      <header className="resposta-topbar">
        <div className="resposta-topbar-inner">
          <div className="resposta-marca">
            <div className="resposta-marca-icone">
              <Building2 size={18} />
            </div>
            <div className="resposta-marca-texto">
              <span className="resposta-marca-titulo">Observatório de Turismo</span>
              <span className="resposta-marca-subtitulo">
                MÓDULO DE COLETA HOTELEIRA
              </span>
            </div>
          </div>

          <div className="resposta-topbar-meta">
            <div className="resposta-protocolo">
              <span className="resposta-protocolo-label">PROTOCOLO</span>
              <span className="resposta-protocolo-codigo">COL-2024-8842</span>
            </div>

            <div className="resposta-ambiente">
              <Lock size={13} />
              <span>Ambiente Seguro</span>
            </div>

            <div className="resposta-avatar" aria-label="Respondente">
              <User size={16} />
            </div>
          </div>
        </div>
      </header>

      <main className="resposta-main">
        <form onSubmit={handleEnviarResposta} className="resposta-container">
          <section className="resposta-hero-card">
            <div className="resposta-hero-info">
              <div className="resposta-hero-kicker">
                <ClipboardCheck size={14} />
                <span>SECRETARIA DE TURISMO &amp; OBSERVATÓRIO MUNICIPAL</span>
              </div>
              <h1 className="resposta-hero-titulo">
                Pesquisa Oficial de Ocupação Hoteleira
              </h1>
              <p className="resposta-hero-subtitulo">
                Ciclo: <strong>Alta Temporada - Verão 2025</strong> | Link Exclusivo do
                Estabelecimento
              </p>
            </div>

            <div className="resposta-tipo-box">
              <span className="resposta-tipo-label">TIPO DE PESQUISA</span>
              <span className="resposta-tipo-badge">
                <ClipboardCheck size={13} />
                Consolidado
              </span>
            </div>
          </section>

          <section className="resposta-card">
            <div className="resposta-secao-topo">
              <div className="resposta-secao-titulo-grupo">
                <span className="resposta-passo-badge">01</span>
                <h2 className="resposta-secao-titulo">
                  Identificação do Estabelecimento
                </h2>
              </div>
              <span className="resposta-tag-suave">Dados Cadastrais Oficiais</span>
            </div>

            <div className="resposta-grid-identificacao">
              <div className="resposta-campo">
                <div className="resposta-label-row">
                  <label htmlFor="nome-fantasia" className="resposta-label">
                    Nome Fantasia do Estabelecimento{' '}
                    <span className="resposta-obrigatorio">*</span>
                  </label>
                  <span className="resposta-label-dica">
                    Editável se houver alteração
                  </span>
                </div>
                <div className="resposta-input-wrap">
                  <BedDouble size={15} className="resposta-input-icone" />
                  <input
                    id="nome-fantasia"
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="resposta-input"
                  />
                </div>
              </div>

              <div className="resposta-campo">
                <label htmlFor="responsavel-cargo" className="resposta-label">
                  Responsável / Cargo
                </label>
                <div className="resposta-input-wrap">
                  <Briefcase size={15} className="resposta-input-icone" />
                  <input
                    id="responsavel-cargo"
                    type="text"
                    value={responsavelCargo}
                    onChange={(e) => setResponsavelCargo(e.target.value)}
                    className="resposta-input"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="resposta-card">
            <div className="resposta-secao-topo">
              <div className="resposta-secao-titulo-bloco">
                <div className="resposta-secao-titulo-grupo">
                  <span className="resposta-passo-badge">02</span>
                  <h2 className="resposta-secao-titulo">Taxa de Ocupação por Período</h2>
                </div>
                <p className="resposta-secao-subtitulo">
                  Índices apurados sobre a capacidade total instalada de Unidades
                  Habitacionais (UHs)
                </p>
              </div>
              <span className="resposta-tag-azul">
                <Info size={13} />
                Base do Cálculo: 120 UHs Ativas
              </span>
            </div>

            <div className="resposta-ocupacao-grid">
              <div className="resposta-consolidada-box">
                <div className="resposta-consolidada-topo">
                  <span className="resposta-consolidada-kicker">TAXA CONSOLIDADA</span>
                  <TrendingUp size={16} className="resposta-icone-primario" />
                </div>
                <h3 className="resposta-consolidada-titulo">Ocupação Geral do Ciclo</h3>
                <p className="resposta-consolidada-desc">
                  Média ponderada do período de 01/12/2024 a 31/01/2025.
                </p>

                <div className="resposta-consolidada-input-box">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={ocupacaoGeral}
                    onChange={(e) =>
                      setOcupacaoGeral(
                        Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                      )
                    }
                    className="resposta-consolidada-input"
                  />
                  <span className="resposta-consolidada-percent">%</span>
                </div>

                <div className="resposta-sparkline-bloco">
                  <div className="resposta-sparkline-legenda">
                    <span>Comportamento Semanal</span>
                    <span className="resposta-sparkline-pico">
                      Pico: Réveillon ({picoSubperiodo?.ocupacao ?? 0}%)
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 220 38"
                    className="resposta-sparkline-svg"
                    aria-hidden="true"
                  >
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2"
                      points={polylinePoints}
                    />
                    {pontosSparkline.map((pt, index) => (
                      <circle
                        key={index}
                        cx={pt.x}
                        cy={pt.y}
                        r="3"
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                </div>
              </div>

              <div className="resposta-subperiodos-bloco">
                <h3 className="resposta-subperiodos-titulo">
                  Detalhamento Quinzenal / Subperíodos
                </h3>

                <div className="resposta-tabela-wrap">
                  <table className="resposta-tabela">
                    <thead>
                      <tr>
                        <th>SUBPERÍODO</th>
                        <th>JANELA TEMPORAL</th>
                        <th>CONTEXTO SAZONAL</th>
                        <th className="col-direita">OCUPAÇÃO DECLARADA (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subperiodos.map((item) => (
                        <tr key={item.id}>
                          <td className="resposta-sub-codigo">{item.codigo}</td>
                          <td className="resposta-sub-janela">{item.janela}</td>
                          <td>
                            {item.destaque ? (
                              <span className="resposta-contexto-badge">
                                {item.contexto}
                              </span>
                            ) : (
                              <span className="resposta-sub-contexto">
                                {item.contexto}
                              </span>
                            )}
                          </td>
                          <td className="col-direita">
                            <div className="resposta-percent-input-wrap">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.ocupacao}
                                onChange={(e) =>
                                  atualizarSubperiodo(
                                    item.id,
                                    parseInt(e.target.value, 10)
                                  )
                                }
                                className="resposta-percent-input"
                              />
                              <span className="resposta-percent-sufixo">%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="resposta-subperiodos-rodape">
                  <div className="resposta-subperiodos-nota">
                    <Info size={13} />
                    <span>
                      Os dados quinzena a quinzena alimentam o índice de sazonalidade
                      regional.
                    </span>
                  </div>
                  <span className="resposta-media-mono">
                    MÉDIA SUBPERÍODOS: {mediaSubperiodos.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="resposta-card">
            <div className="resposta-secao-topo">
              <div className="resposta-secao-titulo-bloco">
                <div className="resposta-secao-titulo-grupo">
                  <span className="resposta-passo-badge">03</span>
                  <h2 className="resposta-secao-titulo">
                    Feriados &amp; Datas Comemorativas (Opcional)
                  </h2>
                </div>
                <p className="resposta-secao-subtitulo">
                  Previsão de ocupação para feriados prolongados ou eventos específicos no
                  período
                </p>
              </div>
              <span className="resposta-tag-suave">Projeção Complementar</span>
            </div>

            <div className="resposta-aviso-box">
              <Info size={14} className="resposta-icone-primario" />
              <span>
                Caso seu estabelecimento tenha projeções pontuais para feriados locais,
                nacionais ou datas comemorativas, adicione abaixo.
              </span>
            </div>

            <div className="resposta-tabela-wrap">
              <table className="resposta-tabela resposta-tabela-feriados">
                <thead>
                  <tr>
                    <th>FERIADO / DATA COMEMORATIVA</th>
                    <th>DATA OU JANELA</th>
                    <th className="col-direita">OCUPAÇÃO ESPERADA (%)</th>
                    <th className="col-centro">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {feriados.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="text"
                          value={item.nome}
                          placeholder="Ex: Corpus Christi"
                          onChange={(e) =>
                            atualizarFeriado(item.id, 'nome', e.target.value)
                          }
                          className="resposta-feriado-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.janela}
                          placeholder="DD/MM a DD/MM/AAAA"
                          onChange={(e) =>
                            atualizarFeriado(item.id, 'janela', e.target.value)
                          }
                          className="resposta-feriado-input resposta-feriado-mono"
                        />
                      </td>
                      <td className="col-direita">
                        <div className="resposta-feriado-percent-wrap">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.ocupacaoEsperada}
                            onChange={(e) =>
                              atualizarFeriado(
                                item.id,
                                'ocupacaoEsperada',
                                Math.min(
                                  100,
                                  Math.max(0, parseInt(e.target.value, 10) || 0)
                                )
                              )
                            }
                            className="resposta-feriado-percent-input"
                          />
                          <span className="resposta-percent-sufixo">%</span>
                        </div>
                      </td>
                      <td className="col-centro">
                        <button
                          type="button"
                          onClick={() => removerFeriado(item.id)}
                          title="Remover feriado"
                          className="resposta-btn-remover"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="resposta-feriados-rodape">
              <button
                type="button"
                onClick={adicionarFeriado}
                className="resposta-btn-adicionar"
              >
                <Plus size={14} />
                Adicionar Feriado / Data Comemorativa
              </button>
              <span className="resposta-feriados-nota">
                Campos facultativos de calibragem preditiva
              </span>
            </div>
          </section>

          <section className="resposta-card">
            <div className="resposta-secao-topo">
              <div className="resposta-secao-titulo-bloco">
                <div className="resposta-secao-titulo-grupo">
                  <span className="resposta-passo-badge">04</span>
                  <h2 className="resposta-secao-titulo">
                    Métricas Operacionais &amp; Indicadores Complementares
                  </h2>
                </div>
                <p className="resposta-secao-subtitulo">
                  Preencha os indicadores diretos consolidados da sua operação no período
                </p>
              </div>
              <span className="resposta-tag-suave">Indicadores Básicos</span>
            </div>

            <div className="resposta-metricas-grid">
              <div className="resposta-metrica-box">
                <div className="resposta-metrica-topo">
                  <span className="resposta-metrica-titulo">Quantidade de Reservas</span>
                  <span className="resposta-obrigatorio">*</span>
                </div>
                <p className="resposta-metrica-desc">
                  Total de reservas confirmadas e realizadas
                </p>
                <div className="resposta-metrica-input-box">
                  <CalendarCheck size={15} className="resposta-metrica-icone" />
                  <input
                    type="number"
                    min="0"
                    value={quantidadeReservas}
                    onChange={(e) =>
                      setQuantidadeReservas(parseInt(e.target.value, 10) || 0)
                    }
                    className="resposta-metrica-input"
                  />
                  <span className="resposta-metrica-unidade">reservas</span>
                </div>
              </div>

              <div className="resposta-metrica-box">
                <div className="resposta-metrica-topo">
                  <span className="resposta-metrica-titulo">Valor Médio da Diária</span>
                  <span className="resposta-obrigatorio">*</span>
                </div>
                <p className="resposta-metrica-desc">
                  Tarifa média líquida por UH ocupada
                </p>
                <div className="resposta-metrica-input-box">
                  <span className="resposta-metrica-prefixo">R$</span>
                  <input
                    type="text"
                    value={valorMedioDiaria}
                    onChange={(e) => setValorMedioDiaria(e.target.value)}
                    className="resposta-metrica-input"
                  />
                </div>
              </div>

              <div className="resposta-metrica-box">
                <div className="resposta-metrica-topo">
                  <span className="resposta-metrica-titulo">Leitos Livres</span>
                  <span className="resposta-obrigatorio">*</span>
                </div>
                <p className="resposta-metrica-desc">
                  Média diária de leitos disponíveis não ocupados
                </p>
                <div className="resposta-metrica-input-box">
                  <BedDouble size={15} className="resposta-metrica-icone" />
                  <input
                    type="number"
                    min="0"
                    value={leitosLivres}
                    onChange={(e) => setLeitosLivres(parseInt(e.target.value, 10) || 0)}
                    className="resposta-metrica-input"
                  />
                  <span className="resposta-metrica-unidade">leitos livres</span>
                </div>
              </div>
            </div>
          </section>

          <section className="resposta-card">
            <div className="resposta-secao-titulo-bloco">
              <div className="resposta-secao-titulo-grupo">
                <span className="resposta-passo-badge">05</span>
                <h2 className="resposta-secao-titulo">
                  Deseja receber o Boletim Oficial consolidado do Observatório de Turismo?
                </h2>
              </div>
              <p className="resposta-secao-subtitulo">
                Publicação bimestral técnica com indicadores consolidados municipais,
                taxas médias e análises comparativas.
              </p>
            </div>

            <div className="resposta-boletim-grid">
              <button
                type="button"
                onClick={() => setCanalBoletim('nenhum')}
                className={`resposta-boletim-card ${
                  canalBoletim === 'nenhum' ? 'ativo' : ''
                }`}
              >
                <span className="resposta-radio">
                  {canalBoletim === 'nenhum' && <span className="resposta-radio-ponto" />}
                </span>
                <div>
                  <span className="resposta-boletim-titulo">Não quero</span>
                  <p className="resposta-boletim-desc">
                    Não enviar relatórios periódicos para este estabelecimento.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCanalBoletim('whatsapp')}
                className={`resposta-boletim-card ${
                  canalBoletim === 'whatsapp' ? 'ativo' : ''
                }`}
              >
                <span className="resposta-radio">
                  {canalBoletim === 'whatsapp' && (
                    <span className="resposta-radio-ponto" />
                  )}
                </span>
                <div>
                  <span className="resposta-boletim-titulo">WhatsApp</span>
                  <p className="resposta-boletim-desc">
                    Envio instantâneo do resumo executivo em PDF no mensageiro.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCanalBoletim('email')}
                className={`resposta-boletim-card ${
                  canalBoletim === 'email' ? 'ativo' : ''
                }`}
              >
                <span className="resposta-radio">
                  {canalBoletim === 'email' && <span className="resposta-radio-ponto" />}
                </span>
                <div>
                  <span className="resposta-boletim-titulo">E-mail</span>
                  <p className="resposta-boletim-desc">
                    Envio de relatório estatístico diagramado para o endereço cadastrado.
                  </p>
                </div>
              </button>
            </div>

            {canalBoletim === 'whatsapp' && (
              <div className="resposta-contato-extra">
                <label htmlFor="whatsapp-boletim" className="resposta-label">
                  Número de Telefone com DDD (WhatsApp){' '}
                  <span className="resposta-obrigatorio">*</span>
                </label>
                <div className="resposta-input-wrap resposta-contato-input-wrap">
                  <MessageSquare size={15} className="resposta-icone-whatsapp" />
                  <input
                    id="whatsapp-boletim"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="resposta-input resposta-input-mono"
                  />
                </div>
                <span className="resposta-contato-nota">
                  Notificações restritas aos dados municipais agregados
                </span>
              </div>
            )}

            {canalBoletim === 'email' && (
              <div className="resposta-contato-extra">
                <label htmlFor="email-boletim" className="resposta-label">
                  Endereço de E-mail para Recebimento{' '}
                  <span className="resposta-obrigatorio">*</span>
                </label>
                <div className="resposta-input-wrap resposta-contato-input-wrap">
                  <Mail size={15} className="resposta-input-icone" />
                  <input
                    id="email-boletim"
                    type="email"
                    value={emailBoletim}
                    onChange={(e) => setEmailBoletim(e.target.value)}
                    placeholder="contato@estabelecimento.com.br"
                    className="resposta-input"
                  />
                </div>
                <span className="resposta-contato-nota">
                  Notificações restritas aos dados municipais agregados
                </span>
              </div>
            )}

            <div className="resposta-acoes-rodape">
              <button
                type="button"
                onClick={handleSalvarRascunho}
                className="resposta-btn resposta-btn-secundario"
              >
                <Save size={14} />
                Salvar Rascunho
              </button>
              <button type="submit" className="resposta-btn resposta-btn-primario">
                Enviar Resposta
                <Send size={14} />
              </button>
            </div>
          </section>
        </form>
      </main>

      {toast && (
        <div role="status" aria-live="polite" className="resposta-toast">
          <CheckCircle2 size={16} className="resposta-toast-icone" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}