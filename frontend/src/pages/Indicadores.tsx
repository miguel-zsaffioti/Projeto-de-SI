import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  BedDouble,
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  TrendingUp,
  Users,
} from 'lucide-react';
import './Indicadores.css';

export type PeriodId = 'verao-2025' | 'inverno-2024' | 'feriados-2024';
export type AuditStatusId = 'homologada' | 'completa';

export interface PeriodOption {
  id: PeriodId;
  label: string;
}

export interface AuditStatusOption {
  id: AuditStatusId;
  label: string;
}

export interface EstablishmentMetric {
  id: string;
  category: string;
  occupancyRate: number;
  adr: number;
  revpar: number;
  auditedUhs: number;
  offeredBeds: number;
  indicatorColor: string;
  isGlobal?: boolean;
}

export interface SeasonSummary {
  occupancyHighlight: string;
  peakOccupancy: string;
  avgStayDuration: string;
  hotelResponseRate: string;
}

export interface DashboardDataset {
  periodId: PeriodId;
  auditStatusId: AuditStatusId;
  auditedUhsTotal: number;
  updatedAt: string;
  sampleConfidence: string;
  sampleBadge: string;
  kpis: {
    weightedOccupancy: number;
    occupancyVariation: string;
    touristFlow: number;
    generalRevpar: number;
    generalAdr: number;
    estimatedRevenueMillions: number;
  };
  establishments: EstablishmentMetric[];
  summary: SeasonSummary;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { id: 'verao-2025', label: 'Alta Temporada - Verão 2025' },
  { id: 'inverno-2024', label: 'Baixa Temporada - Inverno 2024' },
  { id: 'feriados-2024', label: 'Feriados Prolongados 2024' },
];

const AUDIT_STATUS_OPTIONS: AuditStatusOption[] = [
  { id: 'homologada', label: 'Base 100% Homologada' },
  { id: 'completa', label: 'Base Completa (Incl. Pendentes)' },
];

const BASE_DATASETS: Record<PeriodId, DashboardDataset> = {
  'verao-2025': {
    periodId: 'verao-2025',
    auditStatusId: 'homologada',
    auditedUhsTotal: 1420,
    updatedAt: '18/02/2025',
    sampleConfidence: '95% (±2,1%)',
    sampleBadge: 'Amostra Padronizada',
    kpis: {
      weightedOccupancy: 74.8,
      occupancyVariation: '+4,2%',
      touristFlow: 184500,
      generalRevpar: 284.24,
      generalAdr: 380,
      estimatedRevenueMillions: 42.8,
    },
    establishments: [
      {
        id: 'geral',
        category: 'Geral / Média Global',
        occupancyRate: 74.8,
        adr: 380.0,
        revpar: 284.24,
        auditedUhs: 1420,
        offeredBeds: 4260,
        indicatorColor: '#0f2d6b',
        isGlobal: true,
      },
      {
        id: 'resort',
        category: 'Resort / Grande Porte',
        occupancyRate: 86.5,
        adr: 680.0,
        revpar: 588.2,
        auditedUhs: 320,
        offeredBeds: 1120,
        indicatorColor: '#1d4ed8',
      },
      {
        id: 'hotel',
        category: 'Hotel Convencional',
        occupancyRate: 78.0,
        adr: 395.0,
        revpar: 308.1,
        auditedUhs: 680,
        offeredBeds: 2040,
        indicatorColor: '#a5b4fc',
      },
      {
        id: 'pousada',
        category: 'Pousada & Meios Compactos',
        occupancyRate: 65.2,
        adr: 240.0,
        revpar: 156.48,
        auditedUhs: 420,
        offeredBeds: 1100,
        indicatorColor: '#5eead4',
      },
    ],
    summary: {
      occupancyHighlight: '74,8%',
      peakOccupancy: '91,2% (Fim de Semana)',
      avgStayDuration: '3,2 diárias',
      hotelResponseRate: '94,6% de adesão',
    },
  },
  'inverno-2024': {
    periodId: 'inverno-2024',
    auditStatusId: 'homologada',
    auditedUhsTotal: 1360,
    updatedAt: '05/09/2024',
    sampleConfidence: '95% (±2,4%)',
    sampleBadge: 'Amostra Padronizada',
    kpis: {
      weightedOccupancy: 58.4,
      occupancyVariation: '+1,8%',
      touristFlow: 121300,
      generalRevpar: 181.04,
      generalAdr: 310,
      estimatedRevenueMillions: 26.4,
    },
    establishments: [
      {
        id: 'geral',
        category: 'Geral / Média Global',
        occupancyRate: 58.4,
        adr: 310.0,
        revpar: 181.04,
        auditedUhs: 1360,
        offeredBeds: 4080,
        indicatorColor: '#0f2d6b',
        isGlobal: true,
      },
      {
        id: 'resort',
        category: 'Resort / Grande Porte',
        occupancyRate: 67.0,
        adr: 540.0,
        revpar: 361.8,
        auditedUhs: 310,
        offeredBeds: 1085,
        indicatorColor: '#1d4ed8',
      },
      {
        id: 'hotel',
        category: 'Hotel Convencional',
        occupancyRate: 61.5,
        adr: 325.0,
        revpar: 199.88,
        auditedUhs: 650,
        offeredBeds: 1950,
        indicatorColor: '#a5b4fc',
      },
      {
        id: 'pousada',
        category: 'Pousada & Meios Compactos',
        occupancyRate: 49.2,
        adr: 195.0,
        revpar: 95.94,
        auditedUhs: 400,
        offeredBeds: 1045,
        indicatorColor: '#5eead4',
      },
    ],
    summary: {
      occupancyHighlight: '58,4%',
      peakOccupancy: '76,8% (Recesso Escolar)',
      avgStayDuration: '2,6 diárias',
      hotelResponseRate: '92,1% de adesão',
    },
  },
  'feriados-2024': {
    periodId: 'feriados-2024',
    auditStatusId: 'homologada',
    auditedUhsTotal: 1450,
    updatedAt: '12/12/2024',
    sampleConfidence: '95% (±1,9%)',
    sampleBadge: 'Amostra Padronizada',
    kpis: {
      weightedOccupancy: 82.6,
      occupancyVariation: '+6,5%',
      touristFlow: 212800,
      generalRevpar: 346.92,
      generalAdr: 420,
      estimatedRevenueMillions: 51.2,
    },
    establishments: [
      {
        id: 'geral',
        category: 'Geral / Média Global',
        occupancyRate: 82.6,
        adr: 420.0,
        revpar: 346.92,
        auditedUhs: 1450,
        offeredBeds: 4350,
        indicatorColor: '#0f2d6b',
        isGlobal: true,
      },
      {
        id: 'resort',
        category: 'Resort / Grande Porte',
        occupancyRate: 92.4,
        adr: 745.0,
        revpar: 688.38,
        auditedUhs: 330,
        offeredBeds: 1155,
        indicatorColor: '#1d4ed8',
      },
      {
        id: 'hotel',
        category: 'Hotel Convencional',
        occupancyRate: 84.5,
        adr: 430.0,
        revpar: 363.35,
        auditedUhs: 700,
        offeredBeds: 2100,
        indicatorColor: '#a5b4fc',
      },
      {
        id: 'pousada',
        category: 'Pousada & Meios Compactos',
        occupancyRate: 74.8,
        adr: 275.0,
        revpar: 205.7,
        auditedUhs: 420,
        offeredBeds: 1095,
        indicatorColor: '#5eead4',
      },
    ],
    summary: {
      occupancyHighlight: '82,6%',
      peakOccupancy: '96,4% (Feriado Nacional)',
      avgStayDuration: '3,5 diárias',
      hotelResponseRate: '96,2% de adesão',
    },
  },
};

const formatPercent = (value: number): string =>
  `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

const formatCurrency = (value: number): string =>
  `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCurrencyInt = (value: number): string =>
  `R$ ${Math.round(value).toLocaleString('pt-BR')}`;

const formatInteger = (value: number): string =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const formatMillions = (value: number): string =>
  `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} Mi`;

function getActiveDataset(
  periodId: PeriodId,
  auditStatusId: AuditStatusId
): DashboardDataset {
  const base = BASE_DATASETS[periodId];
  if (auditStatusId === 'homologada') {
    return base;
  }

  const extraUhsByRow: Record<string, { uhs: number; beds: number }> = {
    resort: { uhs: 20, beds: 70 },
    hotel: { uhs: 45, beds: 135 },
    pousada: { uhs: 35, beds: 95 },
  };

  const adjustedRows = base.establishments.map((row) => {
    if (row.isGlobal) {
      const occ = Number((row.occupancyRate - 0.9).toFixed(1));
      const adr = Number((row.adr - 6).toFixed(2));
      const revpar = Number(((adr * occ) / 100).toFixed(2));
      return {
        ...row,
        occupancyRate: occ,
        adr,
        revpar,
        auditedUhs: row.auditedUhs + 100,
        offeredBeds: row.offeredBeds + 300,
      };
    }

    const extra = extraUhsByRow[row.id] ?? { uhs: 0, beds: 0 };
    const occ = Number((row.occupancyRate - 0.8).toFixed(1));
    const adr = Number((row.adr - 5).toFixed(2));
    const revpar = Number(((adr * occ) / 100).toFixed(2));

    return {
      ...row,
      occupancyRate: occ,
      adr,
      revpar,
      auditedUhs: row.auditedUhs + extra.uhs,
      offeredBeds: row.offeredBeds + extra.beds,
    };
  });

  const globalRow = adjustedRows[0];

  return {
    ...base,
    auditStatusId: 'completa',
    auditedUhsTotal: base.auditedUhsTotal + 100,
    sampleConfidence: '95% (±2,8%)',
    sampleBadge: 'Inclui Pendentes',
    kpis: {
      weightedOccupancy: globalRow.occupancyRate,
      occupancyVariation: base.kpis.occupancyVariation,
      touristFlow: base.kpis.touristFlow + 6400,
      generalRevpar: globalRow.revpar,
      generalAdr: Math.round(globalRow.adr),
      estimatedRevenueMillions: Number(
        (base.kpis.estimatedRevenueMillions + 1.4).toFixed(1)
      ),
    },
    establishments: adjustedRows,
    summary: {
      ...base.summary,
      occupancyHighlight: formatPercent(globalRow.occupancyRate),
      hotelResponseRate: '98,1% de adesão',
    },
  };
}

export default function Indicadores() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId>('verao-2025');
  const [selectedAuditStatus, setSelectedAuditStatus] =
    useState<AuditStatusId>('homologada');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dataset = useMemo(
    () => getActiveDataset(selectedPeriod, selectedAuditStatus),
    [selectedPeriod, selectedAuditStatus]
  );

  const selectedPeriodLabel = useMemo(
    () =>
      PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label ??
      'Alta Temporada - Verão 2025',
    [selectedPeriod]
  );

  const selectedAuditLabel = useMemo(
    () =>
      AUDIT_STATUS_OPTIONS.find((s) => s.id === selectedAuditStatus)?.label ??
      'Base 100% Homologada',
    [selectedAuditStatus]
  );

  const triggerToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3200);
  };

  const handleExportCsv = () => {
    try {
      const headers = [
        'Tipo / Categoria',
        'Taxa de Ocupação (%)',
        'Diária Média (ADR - BRL)',
        'RevPAR Calculado (BRL)',
        'UHs Auditadas',
        'Leitos Ofertados',
      ];

      const rows = dataset.establishments.map((item) => [
        `"${item.category}"`,
        formatPercent(item.occupancyRate),
        formatCurrency(item.adr),
        formatCurrency(item.revpar),
        `${formatInteger(item.auditedUhs)} UHs`,
        formatInteger(item.offeredBeds),
      ]);

      const metaRows = [
        [`"Observatório de Turismo - Indicadores Consolidados de Turismo"`],
        [`"Período: ${selectedPeriodLabel}"`],
        [`"Status de Auditoria: ${selectedAuditLabel}"`],
        [`"Atualizado em: ${dataset.updatedAt}"`],
        [],
      ];

      const csvLines = [
        ...metaRows.map((r) => r.join(';')),
        headers.join(';'),
        ...rows.map((r) => r.join(';')),
      ];

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvLines.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `indicadores-turismo-${selectedPeriod}-${selectedAuditStatus}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerToast('Relatório CSV exportado com sucesso.');
    } catch {
      triggerToast('Não foi possível exportar o arquivo no momento.');
    }
  };

  return (
    <div className="indicadores-page">
      <div className="indicadores-container">
        <div className="indicadores-header">
          <div className="indicadores-header-info">
            <div className="indicadores-kicker">
              <span className="indicadores-kicker-destaque">
                RELATÓRIO EXECUTIVO
              </span>
              <span>•</span>
              <span>Série Histórica Consolidada</span>
            </div>
            <h1 className="indicadores-titulo">
              Indicadores Consolidados de Turismo
            </h1>
            <p className="indicadores-subtitulo">
              Métricas consolidadas de ocupação, fluxo e desempenho financeiro
              por período e segmento.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="indicadores-btn-exportar"
          >
            <Download size={14} strokeWidth={2.2} />
            <span>Exportar Relatório (.csv / .xlsx)</span>
          </button>
        </div>

        <section
          aria-label="Filtros e status de auditoria"
          className="indicadores-filtros-card"
        >
          <div className="indicadores-filtro-grupo">
            <label htmlFor="period-select" className="indicadores-filtro-label">
              Período &amp; Ciclo de Amostragem
            </label>
            <div className="indicadores-select-wrapper">
              <select
                id="period-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as PeriodId)}
                className="indicadores-select"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="indicadores-select-icone" />
            </div>
          </div>

          <div className="indicadores-filtro-grupo">
            <label htmlFor="audit-select" className="indicadores-filtro-label">
              Status de Auditoria
            </label>
            <div className="indicadores-select-wrapper">
              <select
                id="audit-select"
                value={selectedAuditStatus}
                onChange={(e) =>
                  setSelectedAuditStatus(e.target.value as AuditStatusId)
                }
                className="indicadores-select"
              >
                {AUDIT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="indicadores-select-icone" />
            </div>
          </div>

          <div className="indicadores-auditoria-meta">
            <BadgeCheck
              size={18}
              strokeWidth={2}
              className="indicadores-auditoria-icone"
            />
            <div className="indicadores-auditoria-texto">
              <span className="indicadores-auditoria-titulo">
                {formatInteger(dataset.auditedUhsTotal)} UHs Auditadas
              </span>
              <span className="indicadores-auditoria-data">
                Atualizado em {dataset.updatedAt}
              </span>
            </div>
          </div>
        </section>

        <section
          aria-label="Indicadores principais"
          className="indicadores-kpi-grid"
        >
          <article className="indicadores-kpi-card">
            <div className="indicadores-kpi-body">
              <div className="indicadores-kpi-topo">
                <h2 className="indicadores-kpi-label">OCUPAÇÃO PONDERADA</h2>
                <div className="indicadores-kpi-icone">
                  <BedDouble size={16} strokeWidth={2} />
                </div>
              </div>
              <div className="indicadores-kpi-valor-linha">
                <span className="indicadores-kpi-valor">
                  {formatPercent(dataset.kpis.weightedOccupancy)}
                </span>
                <span className="indicadores-kpi-badge">
                  {dataset.kpis.occupancyVariation}
                </span>
              </div>
            </div>
            <div className="indicadores-kpi-rodape">
              Ponderada pela quantidade total de leitos disponíveis
            </div>
          </article>

          <article className="indicadores-kpi-card">
            <div className="indicadores-kpi-body">
              <div className="indicadores-kpi-topo">
                <h2 className="indicadores-kpi-label">FLUXO DE TURISTAS</h2>
                <div className="indicadores-kpi-icone">
                  <Users size={16} strokeWidth={2} />
                </div>
              </div>
              <div className="indicadores-kpi-valor-linha">
                <span className="indicadores-kpi-valor">
                  {formatInteger(dataset.kpis.touristFlow)}
                </span>
                <span className="indicadores-kpi-unidade">visitantes</span>
              </div>
            </div>
            <div className="indicadores-kpi-rodape">
              Fluxo estimado no período com base em pernoites e ocupação
            </div>
          </article>

          <article className="indicadores-kpi-card">
            <div className="indicadores-kpi-body">
              <div className="indicadores-kpi-topo">
                <h2 className="indicadores-kpi-label">REVPAR GERAL</h2>
                <div className="indicadores-kpi-icone">
                  <BarChart3 size={16} strokeWidth={2} />
                </div>
              </div>
              <div className="indicadores-kpi-valor-linha">
                <span className="indicadores-kpi-valor">
                  {formatCurrency(dataset.kpis.generalRevpar)}
                </span>
              </div>
            </div>
            <div className="indicadores-kpi-rodape indicadores-kpi-rodape-formula">
              ADR ({formatCurrencyInt(dataset.kpis.generalAdr)}) × Ocupação (
              {formatPercent(dataset.kpis.weightedOccupancy)})
            </div>
          </article>

          <article className="indicadores-kpi-card">
            <div className="indicadores-kpi-body">
              <div className="indicadores-kpi-topo">
                <h2 className="indicadores-kpi-label">
                  RECEITA ESTIMADA SETOR
                </h2>
                <div className="indicadores-kpi-icone">
                  <Banknote size={16} strokeWidth={2} />
                </div>
              </div>
              <div className="indicadores-kpi-valor-linha">
                <span className="indicadores-kpi-valor indicadores-kpi-valor-destaque">
                  {formatMillions(dataset.kpis.estimatedRevenueMillions)}
                </span>
                <span className="indicadores-kpi-unidade">BRL</span>
              </div>
            </div>
            <div className="indicadores-kpi-rodape">
              Projeção financeira total de hospedagem para o período
            </div>
          </article>
        </section>

        <section
          aria-label="RevPAR por Tipo de Estabelecimento"
          className="indicadores-revpar-card"
        >
          <div className="indicadores-revpar-header">
            <div className="indicadores-revpar-titulo-grupo">
              <div className="indicadores-revpar-titulo-linha">
                <h2 className="indicadores-revpar-titulo">
                  RevPAR por Tipo de Estabelecimento
                </h2>
                <span className="indicadores-tag-amostra">
                  {dataset.sampleBadge}
                </span>
              </div>
              <p className="indicadores-revpar-subtitulo">
                Desagregação analítica de diária média (ADR), conversão de
                leitos e rendimento por UH disponível.
              </p>
            </div>

            <div className="indicadores-revpar-formula">
              <Info size={14} className="indicadores-revpar-formula-icone" />
              <span>Fórmula: ADR × Taxa de Ocupação</span>
            </div>
          </div>

          <div className="indicadores-tabela-wrapper">
            <table className="indicadores-tabela">
              <thead>
                <tr>
                  <th scope="col">TIPO / CATEGORIA</th>
                  <th scope="col" className="col-num">
                    TAXA DE OCUPAÇÃO
                  </th>
                  <th scope="col" className="col-num">
                    DIÁRIA MÉDIA (ADR)
                  </th>
                  <th scope="col" className="col-num">
                    REVPAR CALCULADO
                  </th>
                  <th scope="col" className="col-num">
                    UHS AUDITADAS
                  </th>
                  <th scope="col" className="col-num">
                    LEITOS OFERTADOS
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataset.establishments.map((row) => (
                  <tr
                    key={row.id}
                    className={row.isGlobal ? 'linha-destaque' : undefined}
                  >
                    <td>
                      <div className="indicadores-celula-categoria">
                        <span
                          className={`indicadores-ponto ${
                            row.isGlobal ? 'indicadores-ponto-geral' : ''
                          }`}
                          style={{ backgroundColor: row.indicatorColor }}
                          aria-hidden="true"
                        />
                        <span>{row.category}</span>
                      </div>
                    </td>
                    <td className="col-num">
                      {formatPercent(row.occupancyRate)}
                    </td>
                    <td className="col-num">{formatCurrency(row.adr)}</td>
                    <td className="col-num indicadores-revpar-valor">
                      {formatCurrency(row.revpar)}
                    </td>
                    <td className="col-num">
                      {formatInteger(row.auditedUhs)} UHs
                    </td>
                    <td className="col-num">
                      {formatInteger(row.offeredBeds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="indicadores-revpar-rodape">
            <span>
              * RevPAR = Revenue Per Available Room. Diárias apuradas conforme
              notas fiscais e declaração formal dos meios homologados.
            </span>
            <span>Confiança Amostral: {dataset.sampleConfidence}</span>
          </div>
        </section>

        <section
          aria-label="Síntese Analítica"
          className="indicadores-sintese-card"
        >
          <div className="indicadores-sintese-topo">
            <div className="indicadores-sintese-kicker">
              <TrendingUp size={14} strokeWidth={2.3} />
              <span>SÍNTESE ANALÍTICA</span>
            </div>
            <h2 className="indicadores-sintese-titulo">
              Desempenho da Temporada
            </h2>
            <p className="indicadores-sintese-texto">
              A taxa média de ocupação de{' '}
              <strong>{dataset.summary.occupancyHighlight}</strong>
            </p>
          </div>

          <div className="indicadores-sintese-box">
            <div className="indicadores-sintese-linha">
              <span className="indicadores-sintese-chave">
                Pico de Ocupação:
              </span>
              <span className="indicadores-sintese-valor">
                {dataset.summary.peakOccupancy}
              </span>
            </div>

            <div className="indicadores-sintese-linha">
              <span className="indicadores-sintese-chave">
                Tempo Médio de Estadia:
              </span>
              <span className="indicadores-sintese-valor">
                {dataset.summary.avgStayDuration}
              </span>
            </div>

            <div className="indicadores-sintese-linha">
              <span className="indicadores-sintese-chave">
                Taxa de Resposta Hoteleira:
              </span>
              <span className="indicadores-sintese-valor-positivo">
                {dataset.summary.hotelResponseRate}
              </span>
            </div>
          </div>
        </section>
      </div>

      {toastMessage && (
        <div role="status" aria-live="polite" className="indicadores-toast">
          <CheckCircle2 size={16} className="indicadores-toast-icone" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}