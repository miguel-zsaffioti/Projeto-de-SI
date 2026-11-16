import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { calcularHashToken, gerarTokenConvite } from '../src/lib/token'

const prisma = new PrismaClient()
const SETE_DIAS_EM_MS = 7 * 24 * 60 * 60 * 1000

async function buscarOuCriarPeriodo(nome: string, dataInicio: string, dataFim: string) {
  const dados = {
    nome,
    dataInicio: new Date(dataInicio),
    dataFim: new Date(dataFim),
    tipoDado: 'REALIZADO' as const,
  }

  return prisma.periodoReferencia.upsert({
    where: { uq_periodo_referencia: dados },
    update: {},
    create: dados,
  })
}

export async function criarPesquisaDemo() {
  const administrador = await prisma.administrador.findFirst({ where: { ativo: true } })
  if (!administrador) {
    throw new Error('Nenhum administrador encontrado. Rode "npm run db:seed" antes.')
  }

  const estabelecimentos = await prisma.estabelecimento.findMany({
    where: { ativo: true },
    orderBy: { codigoInterno: 'asc' },
  })

  const outubro = await buscarOuCriarPeriodo('Outubro/2026', '2026-10-01', '2026-10-31')
  const feriado = await buscarOuCriarPeriodo('Feriado de Finados 2026', '2026-10-31', '2026-11-02')

  const pesquisa = await prisma.pesquisa.create({
    data: {
      tipo: 'CONSOLIDADA',
      criadaPor: administrador.id,
      prazoResposta: new Date(Date.now() + SETE_DIAS_EM_MS),
      periodos: {
        create: [
          { periodoId: outubro.id, ordemExibicao: 1 },
          { periodoId: feriado.id, ordemExibicao: 2 },
        ],
      },
    },
  })

  const convites = []

  for (const estabelecimento of estabelecimentos) {
    const token = gerarTokenConvite()

    await prisma.convitePesquisa.create({
      data: {
        pesquisaId: pesquisa.id,
        estabelecimentoId: estabelecimento.id,
        tokenHash: calcularHashToken(token),
      },
    })

    convites.push({ nomeFantasia: estabelecimento.nomeFantasia, token })
  }

  return { pesquisaId: pesquisa.id, convites }
}

async function main() {
  const { pesquisaId, convites } = await criarPesquisaDemo()
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:5173'

  console.log(`Pesquisa de demonstração #${pesquisaId} criada. Links únicos:\n`)
  for (const { nomeFantasia, token } of convites) {
    console.log(`${nomeFantasia.padEnd(30)} ${baseUrl}/responder/${token}`)
  }
}

if (require.main === module) {
  main()
    .catch((erro) => {
      console.error(erro)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
