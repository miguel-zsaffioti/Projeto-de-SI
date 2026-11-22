import { Prisma } from '@prisma/client'
import { ErroHttp } from '../../errors/ErroHttp'
import { prisma } from '../../lib/prisma'

type FiltroExportacao = {
  periodoIds?: bigint[]
}

export type LinhaCsv = {
  pesquisaId: string
  periodoId: string
  periodo: string
  dataInicio: string
  dataFim: string
  codigo: string
  dimensao: string
  valor: number
  unidade: string
  origem: string
  referenciaEm: Date
}

const pesquisaParaExportacao = Prisma.validator<Prisma.PesquisaDefaultArgs>()({
  include: { periodos: { include: { periodo: true }, orderBy: { ordemExibicao: 'asc' } } },
})

function escaparCsv(valor: string | number): string {
  const texto = String(valor)
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

function dataCsv(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function montarCsv(linhas: LinhaCsv[]): string {
  const cabecalho = [
    'pesquisa_id',
    'periodo_id',
    'periodo',
    'data_inicio',
    'data_fim',
    'codigo_indicador',
    'dimensao',
    'valor',
    'unidade',
    'origem',
    'referencia_em',
  ]
  const registros = linhas.map((linha) =>
    [
      linha.pesquisaId,
      linha.periodoId,
      linha.periodo,
      linha.dataInicio,
      linha.dataFim,
      linha.codigo,
      linha.dimensao,
      linha.valor,
      linha.unidade,
      linha.origem,
      linha.referenciaEm.toISOString(),
    ]
      .map(escaparCsv)
      .join(','),
  )

  return `\uFEFF${[cabecalho.join(','), ...registros].join('\r\n')}\r\n`
}

export async function exportarIndicadoresCsv(pesquisaId: bigint, filtro: FiltroExportacao = {}) {
  const pesquisa = await prisma.pesquisa.findUnique({ where: { id: pesquisaId }, ...pesquisaParaExportacao })
  if (!pesquisa) {
    throw new ErroHttp(404, 'Pesquisa não encontrada', 'PESQUISA_NAO_ENCONTRADA')
  }

  const periodos = filtro.periodoIds
    ? pesquisa.periodos.filter(({ periodoId }) => filtro.periodoIds!.includes(periodoId))
    : pesquisa.periodos

  if (filtro.periodoIds && periodos.length !== filtro.periodoIds.length) {
    throw new ErroHttp(400, 'Um ou mais períodos não pertencem à pesquisa.', 'PERIODO_INVALIDO')
  }

  const linhas: LinhaCsv[] = []
  for (const { periodo } of periodos) {
    const execucao = await prisma.execucaoCalculo.findFirst({
      where: { pesquisaId, periodoId: periodo.id, status: 'CONCLUIDO' },
      include: { indicadores: { orderBy: { id: 'asc' } } },
      orderBy: [{ calculadoEm: 'desc' }, { id: 'desc' }],
    })

    if (execucao && execucao.indicadores.length > 0) {
      linhas.push(
        ...execucao.indicadores.map((indicador) => ({
          pesquisaId: pesquisa.id.toString(),
          periodoId: periodo.id.toString(),
          periodo: periodo.nome,
          dataInicio: dataCsv(periodo.dataInicio),
          dataFim: dataCsv(periodo.dataFim),
          codigo: indicador.codigoIndicador,
          dimensao: indicador.chaveDimensao,
          valor: indicador.valor.toNumber(),
          unidade: indicador.unidade,
          origem: 'CALCULADO',
          referenciaEm: execucao.calculadoEm,
        })),
      )
      continue
    }

    const historicos = await prisma.indicadorHistorico.findMany({
      where: { periodoId: periodo.id, importacao: { status: 'IMPORTADA' } },
      include: { importacao: { select: { importadaEm: true, enviadaEm: true } } },
      orderBy: [{ importacao: { importadaEm: 'desc' } }, { id: 'desc' }],
    })
    const referenciaEm = historicos[0]?.importacao.importadaEm ?? historicos[0]?.importacao.enviadaEm
    if (referenciaEm) {
      linhas.push(
        ...historicos.map((indicador) => ({
          pesquisaId: pesquisa.id.toString(),
          periodoId: periodo.id.toString(),
          periodo: periodo.nome,
          dataInicio: dataCsv(periodo.dataInicio),
          dataFim: dataCsv(periodo.dataFim),
          codigo: indicador.codigoIndicador,
          dimensao: indicador.chaveDimensao,
          valor: indicador.valor.toNumber(),
          unidade: indicador.unidade,
          origem: 'IMPORTADO',
          referenciaEm: indicador.importacao.importadaEm ?? indicador.importacao.enviadaEm,
        })),
      )
    }
  }

  if (linhas.length === 0) {
    throw new ErroHttp(422, 'Não há indicadores para os períodos selecionados.', 'SEM_INDICADORES')
  }

  return montarCsv(linhas)
}
