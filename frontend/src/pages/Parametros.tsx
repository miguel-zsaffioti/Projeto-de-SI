import React, { useMemo, useState } from 'react';
import {
  Calendar,
  RotateCcw,
  Download,
  Save,
  Info,
  Plus,
  Lock,
  Unlock,
  Trash2,
  CheckSquare,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Calculator,
  Receipt,
} from 'lucide-react';
import './Parametros.css';

interface FaixaOcupacao {
  id: string;
  classificacao: string;
  labelBadge: string;
  min: number;
  max: number;
  estilo: 'excelente' | 'otima' | 'regular' | 'baixa';
  bloqueada: boolean;
}

interface TipologiaEconomica {
  id: string;
  nome: string;
  subtitulo: string;
  adr: number;
  uhs: number;
  elasticidade: string;
}

interface ParametrosState {
  cicloVigente: string;
  minimoPorUh: number;
  maximoPorUh: number;
  diariasPeriodoPadrao: number;
  leitosInventarioGeral: number;
  inventarioRhcEstimado: number;
  fatorAjusteRhc: number;
  percentualDayUse: number;
  fatorSazonalFds: number;
  metaEstabelecimentos: number;
  metaLeitosTotais: number;
  confiancaAmostral: number;
  margemErroMaxima: number;
  faixas: FaixaOcupacao[];
  tipologias: TipologiaEconomica[];
}

const CICLOS_DISPONIVEIS = [
  'Alta Temporada - Verão 2025',
  'Baixa Temporada - Inverno 2025',
  'Feriados Prolongados 2025',
  'Consolidado Anual 2024',
];

const ESTADO_INICIAL: ParametrosState = {
  cicloVigente: 'Alta Temporada - Verão 2025',
  minimoPorUh: 1.0,
  maximoPorUh: 3.0,
  diariasPeriodoPadrao: 30,
  leitosInventarioGeral: 4260,
  inventarioRhcEstimado: 850,
  fatorAjusteRhc: 1.0,
  percentualDayUse: 15,
  fatorSazonalFds: 1.25,
  metaEstabelecimentos: 60,
  metaLeitosTotais: 70,
  confiancaAmostral: 95,
  margemErroMaxima: 3.0,
  faixas: [
    {
      id: 'f1',
      classificacao: 'Excelente',
      labelBadge: 'Excelente',
      min: 81,
      max: 100,
      estilo: 'excelente',
      bloqueada: true,
    },
    {
      id: 'f2',
      classificacao: 'Ótima',
      labelBadge: 'Ótima',
      min: 61,
      max: 80,
      estilo: 'otima',
      bloqueada: true,
    },
    {
      id: 'f3',
      classificacao: 'Regular / Moderada',
      labelBadge: 'Regular',
      min: 41,
      max: 60,
      estilo: 'regular',
      bloqueada: true,
    },
    {
      id: 'f4',
      classificacao: 'Baixa',
      labelBadge: 'Baixa',
      min: 0,
      max: 40,
      estilo: 'baixa',
      bloqueada: true,
    },
  ],
  tipologias: [
    {
      id: 't1',
      nome: 'Geral / Média Global',
      subtitulo: 'Consolidado Ponderado do Destino',
      adr: 380.0,
      uhs: 1420,
      elasticidade: 'Automático (Média)',
    },
    {
      id: 't2',
      nome: 'Resort / Grande Porte',
      subtitulo: 'Padrão Superior / Luxo',
      adr: 680.0,
      uhs: 320,
      elasticidade: 'Fixa s/ sazonalidade',
    },
    {
      id: 't3',
      nome: 'Hotel Convencional',
      subtitulo: 'Turismo de Negócios e Lazer',
      adr: 395.0,
      uhs: 680,
      elasticidade: 'Ajuste diário (±15%)',
    },
    {
      id: 't4',
      nome: 'Pousada & Meios Compactos',
      subtitulo: 'Estruturas Familiares / Acolhimento',
      adr: 240.0,
      uhs: 420,
      elasticidade: 'Ponderado por quarto',
    },
  ],
};

const ESTILOS_BADGE: Record<FaixaOcupacao['estilo'], string> = {
  excelente: 'parametros-badge-excelente',
  otima: 'parametros-badge-otima',
  regular: 'parametros-badge-regular',
  baixa: 'parametros-badge-baixa',
};

export default function Parametros() {
  const [dados, setDados] = useState<ParametrosState>(ESTADO_INICIAL);
  const [ultimoSalvo, setUltimoSalvo] = useState<ParametrosState>(ESTADO_INICIAL);
  const [tipologiaEditando, setTipologiaEditando] = useState<TipologiaEconomica | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mediaLeitosUh = useMemo(() => {
    return ((dados.minimoPorUh + dados.maximoPorUh) / 2).toFixed(1);
  }, [dados.minimoPorUh, dados.maximoPorUh]);

  const mostrarToast = (mensagem: string) => {
    setToast(mensagem);
    setTimeout(() => {
      setToast((atual) => (atual === mensagem ? null : atual));
    }, 3000);
  };

  const atualizarCampo = <K extends keyof ParametrosState>(
    campo: K,
    valor: ParametrosState[K]
  ) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSalvar = () => {
    setUltimoSalvo(dados);
    mostrarToast('Parâmetros salvos e indicadores atualizados com sucesso.');
  };

  const handleCancelar = () => {
    setDados(ultimoSalvo);
    mostrarToast('Alterações descartadas.');
  };

  const handleRestaurar = () => {
    setDados(ESTADO_INICIAL);
    mostrarToast('Parâmetros restaurados para o padrão do sistema.');
  };

  const handleExportar = () => {
    const blob = new Blob([JSON.stringify(dados, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parametros-indicadores-${dados.cicloVigente
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarToast('Arquivo de parâmetros exportado em JSON.');
  };

  const atualizarFaixa = (
    id: string,
    campo: keyof FaixaOcupacao,
    valor: string | number | boolean
  ) => {
    setDados((prev) => ({
      ...prev,
      faixas: prev.faixas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    }));
  };

  const adicionarFaixa = () => {
    const novaFaixa: FaixaOcupacao = {
      id: `f-${Date.now()}`,
      classificacao: 'Nova Faixa',
      labelBadge: 'Nova Faixa',
      min: 0,
      max: 100,
      estilo: 'baixa',
      bloqueada: false,
    };
    setDados((prev) => ({ ...prev, faixas: [...prev.faixas, novaFaixa] }));
  };

  const removerFaixa = (id: string) => {
    setDados((prev) => ({
      ...prev,
      faixas: prev.faixas.filter((f) => f.id !== id),
    }));
  };

  const atualizarAdrTipologia = (id: string, novoAdr: number) => {
    setDados((prev) => ({
      ...prev,
      tipologias: prev.tipologias.map((t) =>
        t.id === id ? { ...t, adr: Number.isNaN(novoAdr) ? 0 : novoAdr } : t
      ),
    }));
  };

  const salvarModalTipologia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipologiaEditando) return;
    setDados((prev) => ({
      ...prev,
      tipologias: prev.tipologias.map((t) =>
        t.id === tipologiaEditando.id ? tipologiaEditando : t
      ),
    }));
    setTipologiaEditando(null);
    mostrarToast('Tipologia atualizada.');
  };

  return (
    <div className="parametros-page">
      <div className="parametros-container">
        <div className="parametros-header">
          <div className="parametros-header-info">
            <div className="parametros-kicker">
              <span className="parametros-kicker-badge">Administração do Sistema</span>
              <span>• Modelo Matemático &amp; Regras de Indicadores</span>
            </div>
            <h1 className="parametros-titulo">
              Parâmetros e Fórmulas de Cálculo de Indicadores
            </h1>
            <p className="parametros-subtitulo">
              Configuração dos parâmetros estatísticos, fórmulas de expansão amostral e
              fatores de cálculo para geração automática dos boletins e painéis de
              indicadores analíticos.
            </p>
          </div>

          <div className="parametros-header-acoes">
            <div className="parametros-ciclo-box">
              <Calendar size={16} className="parametros-icone-azul" />
              <div className="parametros-ciclo-info">
                <span className="parametros-ciclo-label">Ciclo Vigente</span>
                <select
                  value={dados.cicloVigente}
                  onChange={(e) => atualizarCampo('cicloVigente', e.target.value)}
                  className="parametros-ciclo-select"
                >
                  {CICLOS_DISPONIVEIS.map((ciclo) => (
                    <option key={ciclo} value={ciclo}>
                      {ciclo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestaurar}
              className="parametros-btn parametros-btn-secundario"
            >
              <RotateCcw size={14} />
              Restaurar
            </button>

            <button
              type="button"
              onClick={handleExportar}
              className="parametros-btn parametros-btn-secundario"
            >
              <Download size={14} />
              Exportar
            </button>

            <button
              type="button"
              onClick={handleSalvar}
              className="parametros-btn parametros-btn-primario"
            >
              <Save size={14} />
              Salvar Parâmetros
            </button>
          </div>
        </div>

        <section className="parametros-card">
          <div className="parametros-secao-topo">
            <div className="parametros-secao-titulo-grupo">
              <span className="parametros-passo-badge">1</span>
              <h2 className="parametros-secao-titulo">
                Capacidade e Dimensionamento de Leitos (UH)
              </h2>
            </div>
            <span className="parametros-secao-tag">Base Fixa</span>
          </div>

          <div className="parametros-formula-box">
            <p>
              <span className="parametros-formula-destaque">Σ</span>
              Leitos médios por UH = (mínimo + máximo de leitos por UH) / 2
            </p>
            <p>
              <span className="parametros-formula-destaque">Σ</span>
              Leitos médios do meio de hospedagem = UH × leitos médios por UH
            </p>
          </div>

          <div className="parametros-grid-3">
            <div className="parametros-campo">
              <label className="parametros-label parametros-label-flex">
                <span>Mínimo por UH</span>
                <span className="parametros-obrigatorio">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={dados.minimoPorUh}
                onChange={(e) =>
                  atualizarCampo('minimoPorUh', parseFloat(e.target.value) || 0)
                }
                className="parametros-input-simples"
              />
            </div>

            <div className="parametros-campo">
              <label className="parametros-label parametros-label-flex">
                <span>Máximo por UH</span>
                <span className="parametros-obrigatorio">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={dados.maximoPorUh}
                onChange={(e) =>
                  atualizarCampo('maximoPorUh', parseFloat(e.target.value) || 0)
                }
                className="parametros-input-simples"
              />
            </div>

            <div className="parametros-campo">
              <label className="parametros-label parametros-label-suave">
                Média Resultante
              </label>
              <div className="parametros-media-resultado">
                {mediaLeitosUh} leitos/UH
              </div>
            </div>
          </div>

          <div className="parametros-info-box">
            <Info size={16} className="parametros-icone-info" />
            <p>
              Aplica-se automaticamente na ausência de declaração detalhada por categoria
              ou tipologia de quarto pelo respondente.
            </p>
          </div>
        </section>

        <section className="parametros-card">
          <div className="parametros-secao-topo">
            <div className="parametros-secao-titulo-grupo">
              <span className="parametros-passo-badge">3</span>
              <h2 className="parametros-secao-titulo">
                Projeção de Fluxo de Turistas (Regulares, Não Respondentes e RHC)
              </h2>
            </div>
            <span className="parametros-secao-tag">Expansão Amostral</span>
          </div>

          <div className="parametros-formula-box parametros-formula-grid">
            <p>
              <span className="parametros-formula-destaque">3.1</span> Respondentes =
              leitos médios × taxa de ocupação × diárias do período
            </p>
            <p>
              <span className="parametros-formula-destaque">3.2</span> Não respondentes =
              (leitos totais - leitos respondentes) × taxa × diárias
            </p>
            <p>
              <span className="parametros-formula-destaque">3.3</span> Meios Regulares =
              Turistas respondentes + Turistas não respondentes
            </p>
            <p>
              <span className="parametros-formula-destaque">3.4</span> Turistas RHC =
              leitos médios do RHC × taxa ponderada × diárias × fator
            </p>
          </div>

          <div className="parametros-grid-4">
            <div className="parametros-campo">
              <label className="parametros-label">Diárias do Período Padrão</label>
              <div className="parametros-input-grupo">
                <input
                  type="number"
                  min="1"
                  value={dados.diariasPeriodoPadrao}
                  onChange={(e) =>
                    atualizarCampo(
                      'diariasPeriodoPadrao',
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="parametros-input-interno"
                />
                <span className="parametros-unidade">dias</span>
              </div>
            </div>

            <div className="parametros-campo">
              <label className="parametros-label">Leitos no Inventário Geral</label>
              <div className="parametros-input-grupo">
                <input
                  type="number"
                  min="0"
                  value={dados.leitosInventarioGeral}
                  onChange={(e) =>
                    atualizarCampo(
                      'leitosInventarioGeral',
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="parametros-input-interno"
                />
                <span className="parametros-unidade">leitos</span>
              </div>
            </div>

            <div className="parametros-campo">
              <label className="parametros-label">Inventário RHC Estimado</label>
              <div className="parametros-input-grupo">
                <input
                  type="number"
                  min="0"
                  value={dados.inventarioRhcEstimado}
                  onChange={(e) =>
                    atualizarCampo(
                      'inventarioRhcEstimado',
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="parametros-input-interno"
                />
                <span className="parametros-unidade">leitos</span>
              </div>
            </div>

            <div className="parametros-campo">
              <label className="parametros-label">Fator de Ajuste RHC</label>
              <div className="parametros-input-grupo">
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={dados.fatorAjusteRhc}
                  onChange={(e) =>
                    atualizarCampo('fatorAjusteRhc', parseFloat(e.target.value) || 0)
                  }
                  className="parametros-input-interno"
                />
                <span className="parametros-unidade">x</span>
              </div>
            </div>
          </div>
        </section>

        <div className="parametros-grid-2">
          <section className="parametros-card">
            <div className="parametros-secao-topo">
              <div className="parametros-secao-titulo-grupo">
                <span className="parametros-passo-badge">4</span>
                <h2 className="parametros-secao-titulo">
                  Day Use e Turistas Totais no Destino
                </h2>
              </div>
              <span className="parametros-secao-tag">Fluxo Global</span>
            </div>

            <div className="parametros-formula-box">
              <p>
                <span className="parametros-formula-destaque">4.1</span> Day use/dia =
                Hospedados / (1 - % day use) - Hospedados
              </p>
              <p>
                <span className="parametros-formula-destaque">4.2</span> Total day use =
                Day use por dia × diárias
              </p>
              <p>
                <span className="parametros-formula-destaque">4.3</span> Turistas totais
                = regulares + RHC + day use
              </p>
            </div>

            <div className="parametros-grid-campos-2">
              <div className="parametros-campo">
                <label className="parametros-label">Percentual Estimado Day Use</label>
                <div className="parametros-input-grupo">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={dados.percentualDayUse}
                    onChange={(e) =>
                      atualizarCampo('percentualDayUse', parseFloat(e.target.value) || 0)
                    }
                    className="parametros-input-interno"
                  />
                  <span className="parametros-unidade">%</span>
                </div>
              </div>

              <div className="parametros-campo">
                <label className="parametros-label">
                  Fator Sazonal Finais de Semana
                </label>
                <div className="parametros-input-grupo">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={dados.fatorSazonalFds}
                    onChange={(e) =>
                      atualizarCampo('fatorSazonalFds', parseFloat(e.target.value) || 0)
                    }
                    className="parametros-input-interno"
                  />
                  <span className="parametros-unidade">x</span>
                </div>
              </div>
            </div>
          </section>

          <section className="parametros-card">
            <div className="parametros-secao-topo">
              <div className="parametros-secao-titulo-grupo">
                <span className="parametros-passo-badge">5</span>
                <h2 className="parametros-secao-titulo">
                  Cobertura Amostral e Metas de Rigor
                </h2>
              </div>
              <span className="parametros-secao-tag">Validação</span>
            </div>

            <div className="parametros-formula-box parametros-formula-inline">
              <SlidersHorizontal size={14} className="parametros-icone-primario" />
              <span>Cobertura = % de meios respondentes e % de leitos respondentes</span>
            </div>

            <div className="parametros-grid-campos-2">
              <div className="parametros-campo">
                <label className="parametros-label">Meta Estabelecimentos</label>
                <div className="parametros-input-grupo">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={dados.metaEstabelecimentos}
                    onChange={(e) =>
                      atualizarCampo(
                        'metaEstabelecimentos',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="parametros-input-interno"
                  />
                  <span className="parametros-unidade">%</span>
                </div>
                <p className="parametros-alerta-texto">
                  Alerta gerado se &lt; {dados.metaEstabelecimentos}%
                </p>
              </div>

              <div className="parametros-campo">
                <label className="parametros-label">Meta de Leitos Totais</label>
                <div className="parametros-input-grupo">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={dados.metaLeitosTotais}
                    onChange={(e) =>
                      atualizarCampo('metaLeitosTotais', parseFloat(e.target.value) || 0)
                    }
                    className="parametros-input-interno"
                  />
                  <span className="parametros-unidade">%</span>
                </div>
                <p className="parametros-ajuda-texto">Representatividade mínima</p>
              </div>

              <div className="parametros-campo">
                <label className="parametros-label">Confiança Amostral</label>
                <div className="parametros-input-grupo">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={dados.confiancaAmostral}
                    onChange={(e) =>
                      atualizarCampo('confiancaAmostral', parseFloat(e.target.value) || 0)
                    }
                    className="parametros-input-interno"
                  />
                  <span className="parametros-unidade">%</span>
                </div>
              </div>

              <div className="parametros-campo">
                <label className="parametros-label">Margem de Erro Máxima</label>
                <div className="parametros-input-grupo">
                  <span className="parametros-prefixo">±</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={dados.margemErroMaxima}
                    onChange={(e) =>
                      atualizarCampo('margemErroMaxima', parseFloat(e.target.value) || 0)
                    }
                    className="parametros-input-interno"
                  />
                  <span className="parametros-unidade">%</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="parametros-card">
          <div className="parametros-secao-topo">
            <div className="parametros-secao-titulo-grupo">
              <span className="parametros-passo-badge">6</span>
              <h2 className="parametros-secao-titulo">
                Distribuição por Faixas de Ocupação (Boletim Oficial)
              </h2>
            </div>
            <button
              type="button"
              onClick={adicionarFaixa}
              className="parametros-btn-adicionar"
            >
              <Plus size={14} />
              Adicionar nova faixa
            </button>
          </div>

          <div className="parametros-tabela-wrap">
            <table className="parametros-tabela">
              <thead>
                <tr>
                  <th>Classificação Oficial</th>
                  <th className="parametros-col-centro">Limite Mínimo (%)</th>
                  <th className="parametros-col-centro">Limite Máximo (%)</th>
                  <th>Badge Visual</th>
                  <th className="parametros-col-centro">Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.faixas.map((faixa) => (
                  <tr key={faixa.id}>
                    <td className="parametros-celula-forte">
                      {faixa.bloqueada ? (
                        faixa.classificacao
                      ) : (
                        <input
                          type="text"
                          value={faixa.classificacao}
                          onChange={(e) => {
                            atualizarFaixa(faixa.id, 'classificacao', e.target.value);
                            atualizarFaixa(faixa.id, 'labelBadge', e.target.value);
                          }}
                          className="parametros-input-faixa-nome"
                        />
                      )}
                    </td>
                    <td className="parametros-col-centro">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={faixa.bloqueada}
                        value={faixa.min}
                        onChange={(e) =>
                          atualizarFaixa(
                            faixa.id,
                            'min',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="parametros-input-limite"
                      />
                    </td>
                    <td className="parametros-col-centro">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={faixa.bloqueada}
                        value={faixa.max}
                        onChange={(e) =>
                          atualizarFaixa(
                            faixa.id,
                            'max',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="parametros-input-limite"
                      />
                    </td>
                    <td>
                      <span
                        className={`parametros-badge ${ESTILOS_BADGE[faixa.estilo]}`}
                      >
                        {faixa.labelBadge} ({faixa.min}% - {faixa.max}%)
                      </span>
                    </td>
                    <td className="parametros-col-centro">
                      <div className="parametros-status-acoes">
                        <button
                          type="button"
                          onClick={() =>
                            atualizarFaixa(faixa.id, 'bloqueada', !faixa.bloqueada)
                          }
                          title={faixa.bloqueada ? 'Desbloquear edição' : 'Bloquear faixa'}
                          className="parametros-btn-icone parametros-btn-cadeado"
                        >
                          {faixa.bloqueada ? <Lock size={15} /> : <Unlock size={15} />}
                        </button>
                        {!faixa.bloqueada && (
                          <button
                            type="button"
                            onClick={() => removerFaixa(faixa.id)}
                            title="Remover faixa"
                            className="parametros-btn-icone parametros-btn-lixeira"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="parametros-card">
          <div className="parametros-secao-topo">
            <div className="parametros-secao-titulo-grupo">
              <span className="parametros-passo-badge">7</span>
              <h2 className="parametros-secao-titulo">
                Indicadores Econômicos: RevPAR e Receita Estimada
              </h2>
            </div>
            <span className="parametros-secao-tag">Financeiro &amp; Diárias</span>
          </div>

          <div className="parametros-formula-box parametros-formula-grid">
            <div className="parametros-formula-item">
              <Calculator size={14} className="parametros-icone-primario" />
              <span>RevPAR = diária média × taxa de ocupação (por tipologia)</span>
            </div>
            <div className="parametros-formula-item">
              <Receipt size={14} className="parametros-icone-primario" />
              <span>Receita estimada = RevPAR × UH total da categoria × diárias</span>
            </div>
          </div>

          <div className="parametros-tabela-wrap">
            <table className="parametros-tabela parametros-tabela-economica">
              <thead>
                <tr>
                  <th>Tipologia Cadastrada</th>
                  <th className="parametros-col-centro">
                    Diária Base de Referência (ADR)
                  </th>
                  <th className="parametros-col-centro">UHs Ativas no Inventário</th>
                  <th className="parametros-col-centro">Fórmula de Elasticidade</th>
                  <th className="parametros-col-direita">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dados.tipologias.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="parametros-celula-forte">{item.nome}</div>
                      <div className="parametros-celula-sub">{item.subtitulo}</div>
                    </td>
                    <td>
                      <div className="parametros-adr-wrap">
                        <span className="parametros-adr-moeda">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.adr.toFixed(2)}
                          onChange={(e) =>
                            atualizarAdrTipologia(item.id, parseFloat(e.target.value))
                          }
                          className="parametros-adr-input"
                        />
                      </div>
                    </td>
                    <td className="parametros-col-centro parametros-celula-mono">
                      {item.uhs.toLocaleString('pt-BR')} UH
                    </td>
                    <td className="parametros-col-centro parametros-celula-elasticidade">
                      {item.elasticidade}
                    </td>
                    <td className="parametros-col-direita">
                      <button
                        type="button"
                        onClick={() => setTipologiaEditando({ ...item })}
                        className="parametros-link-config"
                      >
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="parametros-footer-bar">
          <div className="parametros-footer-info">
            <CheckSquare size={16} className="parametros-footer-icone" />
            <p>
              Os parâmetros salvos recalculam dinamicamente as telas de{' '}
              <strong>Indicadores Consolidados de Turismo</strong>, os relatórios
              executivos em PDF e as rotinas de sincronização via API para o Power BI.
            </p>
          </div>

          <div className="parametros-footer-acoes">
            <button
              type="button"
              onClick={handleCancelar}
              className="parametros-btn parametros-btn-secundario"
            >
              Cancelar alterações
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              className="parametros-btn parametros-btn-primario"
            >
              <CheckCircle2 size={14} />
              Salvar e Atualizar Indicadores
            </button>
          </div>
        </div>
      </div>

      {tipologiaEditando && (
        <div className="parametros-modal-overlay">
          <div className="parametros-modal">
            <div className="parametros-modal-topo">
              <div>
                <h3 className="parametros-modal-titulo">Configurar Tipologia</h3>
                <p className="parametros-modal-sub">{tipologiaEditando.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setTipologiaEditando(null)}
                className="parametros-modal-fechar"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={salvarModalTipologia} className="parametros-modal-form">
              <div className="parametros-campo">
                <label className="parametros-label">
                  Diária Base de Referência (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tipologiaEditando.adr}
                  onChange={(e) =>
                    setTipologiaEditando({
                      ...tipologiaEditando,
                      adr: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="parametros-modal-input parametros-modal-input-mono"
                />
              </div>

              <div className="parametros-campo">
                <label className="parametros-label">UHs Ativas no Inventário</label>
                <input
                  type="number"
                  min="0"
                  value={tipologiaEditando.uhs}
                  onChange={(e) =>
                    setTipologiaEditando({
                      ...tipologiaEditando,
                      uhs: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="parametros-modal-input parametros-modal-input-mono"
                />
              </div>

              <div className="parametros-campo">
                <label className="parametros-label">Fórmula de Elasticidade</label>
                <input
                  type="text"
                  value={tipologiaEditando.elasticidade}
                  onChange={(e) =>
                    setTipologiaEditando({
                      ...tipologiaEditando,
                      elasticidade: e.target.value,
                    })
                  }
                  className="parametros-modal-input"
                />
              </div>

              <div className="parametros-modal-acoes">
                <button
                  type="button"
                  onClick={() => setTipologiaEditando(null)}
                  className="parametros-btn parametros-btn-neutro"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="parametros-btn parametros-btn-primario"
                >
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="parametros-toast">
          <CheckCircle2 size={16} className="parametros-toast-icone" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}