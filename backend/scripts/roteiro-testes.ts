import 'dotenv/config'
import readline from 'readline/promises'
import { PrismaClient } from '@prisma/client'
import { criarPesquisaDemo } from '../prisma/seed-pesquisa-demo'

const API = process.env.API_URL ?? 'http://localhost:3001'
const prisma = new PrismaClient()
const terminal = readline.createInterface({ input: process.stdin, output: process.stdout })
const resultados: { id: string; passou: boolean }[] = []

const verde = (texto: string) => `\x1b[32m${texto}\x1b[0m`
const vermelho = (texto: string) => `\x1b[31m${texto}\x1b[0m`
const cinza = (texto: string) => `\x1b[90m${texto}\x1b[0m`
const negrito = (texto: string) => `\x1b[1m${texto}\x1b[0m`

type Verificacao = { passou: boolean; esperado: string; recebido: string }

type Requisicao = {
  metodo: 'GET' | 'POST'
  caminho: string
  corpo?: unknown
  token?: string
}

type RespostaApi = { status: number; corpo: any }

async function pausar() {
  if (process.stdin.isTTY) {
    await terminal.question(cinza('\n  Enter para o próximo teste...'))
  }
}

function abrirParte(titulo: string, explicacao: string) {
  console.log(`\n\n${negrito(`━━━━━━ ${titulo} ━━━━━━`)}`)
  console.log(cinza(explicacao))
}

function resumir(valor: unknown): string {
  const texto = JSON.stringify(valor)
  return texto.length > 220 ? `${texto.slice(0, 220)}...` : texto
}

async function chamarApi({ metodo, caminho, corpo, token }: Requisicao): Promise<RespostaApi> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })

  return { status: resposta.status, corpo: await resposta.json() }
}

async function testar(id: string, descricao: string, executar: () => Promise<Verificacao>) {
  console.log(`\n${negrito(`[${id}]`)} ${descricao}`)
  const { passou, esperado, recebido } = await executar()

  console.log(`  Esperado: ${esperado}`)
  console.log(`  Recebido: ${recebido}`)
  console.log(passou ? verde('  ✅ Passou') : vermelho('  ❌ Falhou'))

  resultados.push({ id, passou })
  await pausar()
}

async function testarApi(
  id: string,
  descricao: string,
  requisicao: Requisicao,
  statusEsperado: number,
  esperado: string,
  conferirCorpo: (corpo: any) => boolean = () => true,
): Promise<RespostaApi> {
  let resposta: RespostaApi = { status: 0, corpo: null }

  await testar(id, descricao, async () => {
    const corpoEnviado = requisicao.corpo === undefined ? '' : ` ${resumir(requisicao.corpo)}`
    console.log(cinza(`  ${requisicao.metodo} ${requisicao.caminho}${corpoEnviado}`))

    resposta = await chamarApi(requisicao)
    return {
      passou: resposta.status === statusEsperado && conferirCorpo(resposta.corpo),
      esperado: `HTTP ${statusEsperado} · ${esperado}`,
      recebido: `HTTP ${resposta.status} · ${resumir(resposta.corpo)}`,
    }
  })

  return resposta
}

async function parte1Banco() {
  abrirParte(
    'PARTE 1 · Banco populado pelo seed',
    'Confere direto no banco o que o "npm run db:seed" deveria ter criado.',
  )

  await testar('1.1', 'Existe o administrador e a senha está guardada como hash', async () => {
    const admin = await prisma.administrador.findUnique({ where: { email: 'admin@oto.local' } })
    return {
      passou: !!admin && admin.senhaHash.startsWith('$2'),
      esperado: 'admin@oto.local com senha em hash bcrypt ($2...)',
      recebido: admin ? `${admin.email} · senha ${admin.senhaHash.slice(0, 7)}...` : 'nenhum administrador',
    }
  })

  await testar('1.2', 'Inventário com 13 meios de hospedagem', async () => {
    const total = await prisma.estabelecimento.count()
    const porTipo = await prisma.estabelecimento.groupBy({ by: ['tipoHospedagem'], _count: true })
    return {
      passou: total === 13,
      esperado: '13 estabelecimentos',
      recebido: `${total} · ${porTipo.map((tipo) => `${tipo.tipoHospedagem}: ${tipo._count}`).join(', ')}`,
    }
  })

  await testar('1.3', 'Contatos cadastrados (o Hotel Solar do Turista não tem WhatsApp)', async () => {
    const total = await prisma.contatoEstabelecimento.count()
    const solar = await prisma.contatoEstabelecimento.findMany({
      where: { estabelecimento: { codigoInterno: 'MH-006' } },
    })
    const canaisSolar = solar.map((contato) => contato.canal).join(', ')
    return {
      passou: total === 25 && canaisSolar === 'EMAIL',
      esperado: '25 contatos · MH-006 só com EMAIL',
      recebido: `${total} contatos · MH-006 com ${canaisSolar || 'nenhum'}`,
    }
  })

  await testar('1.4', 'RHC agregado cadastrado', async () => {
    const rhc = await prisma.inventarioRhc.findMany()
    return {
      passou: rhc.length === 1 && rhc[0].totalUh === 850,
      esperado: '1 registro com 850 UH',
      recebido: rhc.map((item) => `${item.totalUh} UH, ${item.leitosMinPorUh} a ${item.leitosMaxPorUh} leitos/UH`).join(' | ') || 'nenhum',
    }
  })

  await testar('1.5', 'Parâmetros de cálculo ativos', async () => {
    const ativo = await prisma.conjuntoParametrosCalculo.findFirst({
      where: { ativo: true },
      include: { parametrosDiaria: true },
    })
    return {
      passou: !!ativo && ativo.percentualDayUse.toNumber() === 15.15 && ativo.parametrosDiaria.length === 8,
      esperado: 'day use 15.15% e 8 diárias médias (4 tipos × 2 métodos)',
      recebido: ativo
        ? `day use ${ativo.percentualDayUse}% e ${ativo.parametrosDiaria.length} diárias médias`
        : 'nenhum conjunto ativo',
    }
  })
}

async function parte2Login() {
  abrirParte('PARTE 2 · Login do administrador (UC01)', 'Chama a API de login com casos certos e errados.')

  const login = await testarApi(
    '2.1',
    'Login com e-mail e senha corretos',
    { metodo: 'POST', caminho: '/api/auth/login', corpo: { email: 'admin@oto.local', senha: 'Admin@123' } },
    200,
    'devolve um token e os dados do admin',
    (corpo) => typeof corpo.token === 'string',
  )

  await testarApi(
    '2.2',
    'Senha errada',
    { metodo: 'POST', caminho: '/api/auth/login', corpo: { email: 'admin@oto.local', senha: 'errada' } },
    401,
    'mensagem genérica CREDENCIAIS_INVALIDAS',
    (corpo) => corpo.codigo === 'CREDENCIAIS_INVALIDAS',
  )

  await testarApi(
    '2.3',
    'E-mail que não existe (não pode revelar que o e-mail não existe)',
    { metodo: 'POST', caminho: '/api/auth/login', corpo: { email: 'ninguem@teste.com', senha: 'x' } },
    401,
    'a mesma mensagem do teste 2.2',
    (corpo) => corpo.codigo === 'CREDENCIAIS_INVALIDAS',
  )

  await testarApi(
    '2.4',
    'Campos inválidos (e-mail mal escrito e sem senha)',
    { metodo: 'POST', caminho: '/api/auth/login', corpo: { email: 'abc' } },
    400,
    'lista os campos com problema',
    (corpo) => corpo.codigo === 'DADOS_INVALIDOS' && corpo.campos.length === 2,
  )

  await testarApi(
    '2.5',
    'Rota protegida /me usando o token do teste 2.1',
    { metodo: 'GET', caminho: '/api/auth/me', token: login.corpo?.token },
    200,
    'dados do admin logado',
    (corpo) => corpo.email === 'admin@oto.local',
  )

  await testarApi(
    '2.6',
    'Rota protegida /me sem token',
    { metodo: 'GET', caminho: '/api/auth/me' },
    401,
    'NAO_AUTENTICADO (o front redireciona para o login)',
    (corpo) => corpo.codigo === 'NAO_AUTENTICADO',
  )
}

async function parte3Formulario() {
  abrirParte(
    'PARTE 3 · Formulário de resposta (UC04 e UC05)',
    'Cria uma pesquisa de teste e responde pelo link único de um estabelecimento.',
  )

  const { pesquisaId, convites } = await criarPesquisaDemo()
  const { nomeFantasia, token } = convites[0]
  const caminho = `/api/formulario/${token}`

  console.log(`\n  Pesquisa de teste #${pesquisaId} criada com ${convites.length} links.`)
  console.log(`  Vamos responder como: ${negrito(nomeFantasia)}`)
  console.log(cinza(`  Token do link: ${token}`))
  await pausar()

  const formulario = await testarApi(
    '3.1',
    'Abrir o formulário pelo link',
    { metodo: 'GET', caminho },
    200,
    `nome "${nomeFantasia}", 2 períodos e resposta null`,
    (corpo) => corpo.estabelecimento?.nomeFantasia === nomeFantasia && corpo.periodos?.length === 2 && corpo.resposta === null,
  )

  const [periodo1, periodo2] = formulario.corpo.periodos.map((periodo: { id: string }) => periodo.id)

  await testarApi(
    '3.2',
    'Link inválido',
    { metodo: 'GET', caminho: '/api/formulario/link-que-nao-existe' },
    404,
    'LINK_INVALIDO',
    (corpo) => corpo.codigo === 'LINK_INVALIDO',
  )

  await testarApi(
    '3.3',
    'Taxa de ocupação acima de 100',
    {
      metodo: 'POST',
      caminho: `${caminho}/resposta`,
      corpo: {
        ocupacoes: [{ periodoId: periodo1, taxaOcupacao: 150 }, { periodoId: periodo2, taxaOcupacao: 50 }],
        preferenciaBoletim: 'NAO_QUERO',
      },
    },
    400,
    'DADOS_INVALIDOS apontando a taxa',
    (corpo) => corpo.codigo === 'DADOS_INVALIDOS',
  )

  await testarApi(
    '3.4',
    'Faltando a taxa de um dos períodos',
    {
      metodo: 'POST',
      caminho: `${caminho}/resposta`,
      corpo: { ocupacoes: [{ periodoId: periodo1, taxaOcupacao: 70 }], preferenciaBoletim: 'NAO_QUERO' },
    },
    400,
    'avisa qual período ficou sem taxa',
    (corpo) => corpo.campos?.[0]?.campo === `periodo.${periodo2}`,
  )

  await testarApi(
    '3.5',
    'Quer o boletim por e-mail, mas não informou o e-mail',
    {
      metodo: 'POST',
      caminho: `${caminho}/resposta`,
      corpo: {
        ocupacoes: [{ periodoId: periodo1, taxaOcupacao: 70 }, { periodoId: periodo2, taxaOcupacao: 90 }],
        preferenciaBoletim: 'EMAIL',
      },
    },
    400,
    'erro no campo emailConfirmacao',
    (corpo) => corpo.campos?.[0]?.campo === 'emailConfirmacao',
  )

  await testarApi(
    '3.6',
    'Primeira resposta válida',
    {
      metodo: 'POST',
      caminho: `${caminho}/resposta`,
      corpo: {
        ocupacoes: [{ periodoId: periodo1, taxaOcupacao: 70 }, { periodoId: periodo2, taxaOcupacao: 90 }],
        preferenciaBoletim: 'WHATSAPP',
      },
    },
    201,
    '"Resposta enviada com sucesso"',
    (corpo) => corpo.retificada === false,
  )

  await testarApi(
    '3.7',
    'Abrir o link de novo: o formulário volta preenchido',
    { metodo: 'GET', caminho },
    200,
    'resposta com as taxas 70 e 90',
    (corpo) => corpo.resposta?.ocupacoes?.map((o: { taxaOcupacao: number }) => o.taxaOcupacao).join(',') === '70,90',
  )

  await testarApi(
    '3.8',
    'Retificar: muda a taxa do 1º período e passa a querer o boletim por e-mail',
    {
      metodo: 'POST',
      caminho: `${caminho}/resposta`,
      corpo: {
        ocupacoes: [{ periodoId: periodo1, taxaOcupacao: 80 }, { periodoId: periodo2, taxaOcupacao: 90 }],
        preferenciaBoletim: 'EMAIL',
        emailConfirmacao: 'gerente@hotel.com',
      },
    },
    200,
    'retificada: true e 3 campos alterados',
    (corpo) => corpo.retificada === true && corpo.camposAlterados === 3,
  )

  await testar('3.9', 'Histórico da retificação gravado no banco', async () => {
    const convite = await prisma.convitePesquisa.findFirst({
      where: { pesquisaId, estabelecimento: { nomeFantasia } },
      include: { resposta: { include: { historico: true } } },
    })
    const historico = convite?.resposta?.historico ?? []
    const linhas = historico.map((item) => `${item.campoAlterado}: ${item.valorAnterior ?? 'vazio'} → ${item.valorNovo}`)
    return {
      passou: convite?.status === 'RESPONDIDO' && historico.length === 3,
      esperado: 'convite RESPONDIDO e 3 linhas no histórico',
      recebido: `convite ${convite?.status} · ${linhas.join(' | ')}`,
    }
  })

  await prisma.pesquisa.update({
    where: { id: pesquisaId },
    data: { status: 'ENCERRADA', encerradaEm: new Date() },
  })
  console.log(cinza('\n  Encerrando a pesquisa de teste para simular o fim do prazo...'))

  await testarApi(
    '3.10',
    'Tentar abrir o formulário depois do prazo',
    { metodo: 'GET', caminho },
    410,
    'PESQUISA_ENCERRADA',
    (corpo) => corpo.codigo === 'PESQUISA_ENCERRADA',
  )
}

async function garantirApiNoAr() {
  try {
    await fetch(`${API}/health`)
  } catch {
    console.log(vermelho(`\nA API não está respondendo em ${API}.`))
    console.log('Suba a API em outro terminal com "npm run dev" e rode o roteiro de novo.\n')
    process.exit(1)
  }
}

function mostrarResumo() {
  const aprovados = resultados.filter((resultado) => resultado.passou).length
  const reprovados = resultados.filter((resultado) => !resultado.passou)

  console.log(`\n\n${negrito('━━━━━━ RESUMO ━━━━━━')}`)
  console.log(`${aprovados} de ${resultados.length} testes passaram.`)
  if (reprovados.length > 0) {
    console.log(vermelho(`Falharam: ${reprovados.map((resultado) => resultado.id).join(', ')}`))
  }
}

async function main() {
  const parteEscolhida = process.argv[2]
  const partes: Record<string, () => Promise<void>> = {
    '1': parte1Banco,
    '2': parte2Login,
    '3': parte3Formulario,
  }

  await garantirApiNoAr()

  const selecionadas = parteEscolhida ? [parteEscolhida] : Object.keys(partes)
  for (const numero of selecionadas) {
    if (!partes[numero]) {
      console.log(vermelho(`Parte "${numero}" não existe. Use 1, 2 ou 3.`))
      continue
    }
    await partes[numero]()
  }

  mostrarResumo()
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(async () => {
    terminal.close()
    await prisma.$disconnect()
  })
