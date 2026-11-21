import 'dotenv/config'
import readline from 'readline/promises'
import { PrismaClient } from '@prisma/client'
import { criarPesquisaDemo } from '../prisma/seed-pesquisa-demo'
import { periodosDaPlanilha } from '../tests/planilha-oto'

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
  metodo: 'GET' | 'POST' | 'PATCH'
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

type Indicador = { codigo: string; dimensao: string; valor: number }
type PeriodoCalculado = { periodo: { id: string; nome: string }; status: string | null; indicadores: Indicador[] }

async function entrarComoAdmin(): Promise<string> {
  const login = await chamarApi({
    metodo: 'POST',
    caminho: '/api/auth/login',
    corpo: { email: 'admin@oto.local', senha: 'Admin@123' },
  })
  return login.corpo.token
}

function valorDoIndicador(periodo: PeriodoCalculado | undefined, codigo: string, dimensao = 'TOTAL') {
  return periodo?.indicadores.find((indicador) => indicador.codigo === codigo && indicador.dimensao === dimensao)?.valor
}

function arredondar(valor: number | undefined) {
  return valor === undefined ? 'ausente' : valor.toFixed(2)
}

function formatarNumero(valor: number | undefined, casas = 2) {
  return valor === undefined ? '—' : valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })
}

function mostrarIndicadores(periodo: PeriodoCalculado | undefined) {
  if (!periodo) {
    return
  }
  const valor = (codigo: string, dimensao?: string) => valorDoIndicador(periodo, codigo, dimensao)
  const linhas: [string, string][] = [
    ['Taxa de ocupação ponderada', `${formatarNumero(valor('TAXA_OCUPACAO_PONDERADA'))}%`],
    ['Turistas dos respondentes', formatarNumero(valor('TURISTAS_RESPONDENTES'), 0)],
    ['Turistas dos não respondentes', formatarNumero(valor('TURISTAS_NAO_RESPONDENTES'), 0)],
    ['Turistas em RHC', formatarNumero(valor('TURISTAS_RHC'), 0)],
    ['Turistas de day use', formatarNumero(valor('TURISTAS_DAY_USE'), 0)],
    ['Total de turistas', formatarNumero(valor('TURISTAS_TOTAL'), 0)],
    ['Turistas por dia', formatarNumero(valor('TURISTAS_POR_DIA'), 0)],
    ['Cobertura (estabelecimentos / leitos)', `${formatarNumero(valor('COBERTURA_ESTABELECIMENTOS'))}% / ${formatarNumero(valor('COBERTURA_LEITOS'))}%`],
    [
      'Faixas (excelente/ótima/boa/regular/ruim)',
      ['EXCELENTE', 'OTIMA', 'BOA', 'REGULAR', 'RUIM'].map((faixa) => valor('ESTABELECIMENTOS_POR_FAIXA', faixa)).join(' / '),
    ],
    ...['HOTEL', 'RESORT', 'POUSADA', 'GERAL'].map((tipo): [string, string] => [
      `RevPAR ${tipo.toLowerCase()} (aritm. / pond.)`,
      `R$ ${formatarNumero(valor('REVPAR_ARITMETICA', tipo))} / R$ ${formatarNumero(valor('REVPAR_PONDERADA', tipo))}`,
    ]),
  ]

  console.log(`\n  ${negrito(periodo.periodo.nome)}`)
  linhas.forEach(([nome, texto]) => console.log(`    ${nome.padEnd(42, '.')} ${texto}`))
}

type ItemHistorico = {
  campo: string
  periodo: { nome: string | null } | null
  valorAnterior: string | null
  valorNovo: string | null
  autor: string
  administrador: { nome: string } | null
  alteradoEm: string
}

function mostrarHistorico(historico: ItemHistorico[]) {
  console.log(`\n  ${negrito('Histórico da resposta (mais recente primeiro)')}`)
  historico.forEach((item) => {
    const hora = new Date(item.alteradoEm).toLocaleTimeString('pt-BR')
    const campo = item.periodo ? `${item.campo} (${item.periodo.nome})` : item.campo
    const autor = item.administrador ? `${item.autor} ${item.administrador.nome}` : item.autor
    console.log(`    ${hora}  ${campo.padEnd(38)} ${item.valorAnterior ?? 'vazio'} → ${item.valorNovo ?? 'vazio'}   por ${autor}`)
  })
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

async function parte4Indicadores() {
  abrirParte(
    'PARTE 4 · Cálculo dos indicadores (UC09)',
    'Responde a pesquisa com as mesmas taxas da planilha de conferência e compara os indicadores calculados pela API.',
  )

  const tokenAdmin = await entrarComoAdmin()
  const { pesquisaId, convites } = await criarPesquisaDemo()
  const caminho = `/api/pesquisas/${pesquisaId}/indicadores`
  const [outubro, feriado] = periodosDaPlanilha

  const formulario = await chamarApi({ metodo: 'GET', caminho: `/api/formulario/${convites[0].token}` })
  const idDoPeriodo = (nome: string) => formulario.corpo.periodos.find((periodo: { nome: string }) => periodo.nome === nome).id

  const respondentes = convites.filter(({ codigoInterno }) => outubro.taxasInformadas[codigoInterno] !== undefined)
  for (const { codigoInterno, token } of respondentes) {
    await chamarApi({
      metodo: 'POST',
      caminho: `/api/formulario/${token}/resposta`,
      corpo: {
        ocupacoes: [
          { periodoId: idDoPeriodo(outubro.nome), taxaOcupacao: outubro.taxasInformadas[codigoInterno] },
          { periodoId: idDoPeriodo(feriado.nome), taxaOcupacao: feriado.taxasInformadas[codigoInterno] },
        ],
        preferenciaBoletim: 'NAO_QUERO',
      },
    })
  }

  console.log(`\n  Pesquisa de teste #${pesquisaId}: ${respondentes.length} de ${convites.length} estabelecimentos responderam.`)
  console.log(cinza('  As taxas são as da planilha de conferência (backend/tests/planilha-oto.ts).'))
  await pausar()

  await testarApi('4.1', 'Consultar indicadores sem login', { metodo: 'GET', caminho }, 401, 'NAO_AUTENTICADO', (corpo) => corpo.codigo === 'NAO_AUTENTICADO')

  await testarApi(
    '4.2',
    'Consultar antes de calcular',
    { metodo: 'GET', caminho, token: tokenAdmin },
    200,
    '2 períodos ainda sem cálculo (status null)',
    (corpo) => corpo.periodos?.length === 2 && corpo.periodos.every((periodo: PeriodoCalculado) => periodo.status === null),
  )

  const calculo = await testarApi(
    '4.3',
    'Calcular os indicadores',
    { metodo: 'POST', caminho: `${caminho}/calcular`, token: tokenAdmin },
    201,
    '2 períodos com status CONCLUIDO',
    (corpo) => corpo.periodos?.every((periodo: PeriodoCalculado) => periodo.status === 'CONCLUIDO'),
  )

  const [calculadoOutubro, calculadoFeriado] = calculo.corpo.periodos as PeriodoCalculado[]

  console.log(cinza('\n  Principais indicadores calculados pela API:'))
  mostrarIndicadores(calculadoOutubro)
  mostrarIndicadores(calculadoFeriado)
  await pausar()

  const conferir = (id: string, periodo: PeriodoCalculado | undefined, esperado: typeof outubro) =>
    testar(id, `${esperado.nome}: confere com a planilha`, async () => {
      const taxa = valorDoIndicador(periodo, 'TAXA_OCUPACAO_PONDERADA')
      const total = valorDoIndicador(periodo, 'TURISTAS_TOTAL')
      const porDia = valorDoIndicador(periodo, 'TURISTAS_POR_DIA')
      const pertoDe = (valor: number | undefined, alvo: number) => valor !== undefined && Math.abs(valor - alvo) <= 0.01
      return {
        passou:
          pertoDe(taxa, esperado.esperado.taxaOcupacaoPonderada) &&
          pertoDe(total, esperado.esperado.turistasTotal) &&
          pertoDe(porDia, esperado.esperado.turistasPorDia),
        esperado: `taxa ${esperado.esperado.taxaOcupacaoPonderada}% · total ${esperado.esperado.turistasTotal} · por dia ${esperado.esperado.turistasPorDia}`,
        recebido: `taxa ${arredondar(taxa)}% · total ${arredondar(total)} · por dia ${arredondar(porDia)}`,
      }
    })

  await conferir('4.4', calculadoOutubro, outubro)
  await conferir('4.5', calculadoFeriado, feriado)

  await testar('4.6', 'Outubro: cobertura, faixas de ocupação e RevPAR de hotel', async () => {
    const cobertura = valorDoIndicador(calculadoOutubro, 'COBERTURA_ESTABELECIMENTOS')
    const excelente = valorDoIndicador(calculadoOutubro, 'ESTABELECIMENTOS_POR_FAIXA', 'EXCELENTE')
    const otima = valorDoIndicador(calculadoOutubro, 'ESTABELECIMENTOS_POR_FAIXA', 'OTIMA')
    const revparHotel = valorDoIndicador(calculadoOutubro, 'REVPAR_ARITMETICA', 'HOTEL')
    return {
      passou: arredondar(cobertura) === '61.54' && excelente === 1 && otima === 3 && arredondar(revparHotel) === '181.39',
      esperado: 'cobertura 61.54% · 1 excelente · 3 ótimas · RevPAR hotel R$ 181.39',
      recebido: `cobertura ${arredondar(cobertura)}% · ${excelente} excelente · ${otima} ótimas · RevPAR hotel R$ ${arredondar(revparHotel)}`,
    }
  })

  const semRespostas = await criarPesquisaDemo()
  await testarApi(
    '4.7',
    'Calcular uma pesquisa que ninguém respondeu',
    { metodo: 'POST', caminho: `/api/pesquisas/${semRespostas.pesquisaId}/indicadores/calcular`, token: tokenAdmin },
    422,
    'SEM_RESPOSTAS',
    (corpo) => corpo.codigo === 'SEM_RESPOSTAS',
  )

  await testarApi(
    '4.8',
    'Pesquisa que não existe',
    { metodo: 'POST', caminho: '/api/pesquisas/999999999/indicadores/calcular', token: tokenAdmin },
    404,
    'PESQUISA_NAO_ENCONTRADA',
    (corpo) => corpo.codigo === 'PESQUISA_NAO_ENCONTRADA',
  )
}

async function parte5Correcao() {
  abrirParte(
    'PARTE 5 · Correção de resposta pelo administrador (UC08)',
    'Um estabelecimento responde, a pesquisa é encerrada e o admin corrige só o campo errado, com histórico.',
  )

  const tokenAdmin = await entrarComoAdmin()
  const { pesquisaId, convites } = await criarPesquisaDemo()
  const { nomeFantasia, token } = convites[0]

  const formulario = await chamarApi({ metodo: 'GET', caminho: `/api/formulario/${token}` })
  const [periodo1, periodo2] = formulario.corpo.periodos.map((periodo: { id: string }) => periodo.id)

  await chamarApi({
    metodo: 'POST',
    caminho: `/api/formulario/${token}/resposta`,
    corpo: {
      ocupacoes: [{ periodoId: periodo1, taxaOcupacao: 78 }, { periodoId: periodo2, taxaOcupacao: 96 }],
      preferenciaBoletim: 'WHATSAPP',
    },
  })

  await prisma.pesquisa.update({ where: { id: pesquisaId }, data: { status: 'ENCERRADA', encerradaEm: new Date() } })

  const resposta = await prisma.respostaPesquisa.findFirstOrThrow({ where: { pesquisaId } })
  const caminho = `/api/respostas/${resposta.id}`
  const corrigir = (corpo: unknown) => ({ metodo: 'PATCH' as const, caminho, corpo, token: tokenAdmin })

  console.log(`\n  Pesquisa de teste #${pesquisaId} (já encerrada). ${negrito(nomeFantasia)} respondeu 78% e 96%.`)
  console.log(cinza(`  Resposta #${resposta.id}`))
  await pausar()

  await testarApi('5.1', 'Ver a resposta sem login', { metodo: 'GET', caminho }, 401, 'NAO_AUTENTICADO', (corpo) => corpo.codigo === 'NAO_AUTENTICADO')

  await testarApi(
    '5.2',
    'Ver a resposta como admin',
    { metodo: 'GET', caminho, token: tokenAdmin },
    200,
    `"${nomeFantasia}" com taxas 78 e 96`,
    (corpo) =>
      corpo.estabelecimento?.nomeFantasia === nomeFantasia &&
      corpo.ocupacoes?.map((o: { taxaOcupacao: number }) => o.taxaOcupacao).join(',') === '78,96',
  )

  await testarApi(
    '5.3',
    'Corrigir a taxa para 150 (fora de 0 a 100)',
    corrigir({ campo: 'taxaOcupacao', periodoId: periodo1, valor: 150 }),
    400,
    'DADOS_INVALIDOS apontando o valor',
    (corpo) => corpo.codigo === 'DADOS_INVALIDOS',
  )

  await testarApi(
    '5.4',
    'Corrigir a taxa de um período que não é desta resposta',
    corrigir({ campo: 'taxaOcupacao', periodoId: '999999', valor: 50 }),
    400,
    'erro no campo periodoId',
    (corpo) => corpo.campos?.[0]?.campo === 'periodoId',
  )

  await testarApi(
    '5.5',
    'Corrigir a taxa do 1º período de 78 para 80, com a pesquisa encerrada',
    corrigir({ campo: 'taxaOcupacao', periodoId: periodo1, valor: 80 }),
    200,
    'alterado: true (o admin corrige mesmo depois do prazo)',
    (corpo) => corpo.alterado === true && corpo.resposta?.ocupacoes?.[0]?.taxaOcupacao === 80,
  )

  await testarApi(
    '5.6',
    'Mandar o mesmo valor de novo',
    corrigir({ campo: 'taxaOcupacao', periodoId: periodo1, valor: 80 }),
    200,
    'alterado: false e nada vai para o histórico',
    (corpo) => corpo.alterado === false,
  )

  await chamarApi({ metodo: 'POST', caminho: `/api/pesquisas/${pesquisaId}/indicadores/calcular`, token: tokenAdmin })
  console.log(cinza('\n  Calculando os indicadores desta pesquisa para ver o recálculo automático...'))

  await testarApi(
    '5.7',
    'Corrigir a taxa para 90 depois do cálculo',
    corrigir({ campo: 'taxaOcupacao', periodoId: periodo1, valor: 90 }),
    200,
    'indicadoresRecalculados: true',
    (corpo) => corpo.alterado === true && corpo.indicadoresRecalculados === true,
  )

  await testarApi(
    '5.8',
    'Os indicadores já mostram a taxa corrigida',
    { metodo: 'GET', caminho: `/api/pesquisas/${pesquisaId}/indicadores`, token: tokenAdmin },
    200,
    'taxa ponderada do 1º período = 90',
    (corpo) => valorDoIndicador(corpo.periodos?.[0], 'TAXA_OCUPACAO_PONDERADA') === 90,
  )

  await testarApi(
    '5.9',
    'Apagar a taxa do 2º período (valor null)',
    corrigir({ campo: 'taxaOcupacao', periodoId: periodo2, valor: null }),
    200,
    'taxa do 2º período fica vazia, o resto da resposta continua',
    (corpo) => corpo.resposta?.ocupacoes?.[1]?.taxaOcupacao === null && corpo.resposta?.ocupacoes?.[0]?.taxaOcupacao === 90,
  )

  await testarApi(
    '5.10',
    'Trocar a preferência do boletim para e-mail',
    corrigir({ campo: 'preferenciaBoletim', valor: 'EMAIL' }),
    200,
    'preferenciaBoletim EMAIL, sem recalcular (não muda os indicadores)',
    (corpo) => corpo.resposta?.preferenciaBoletim === 'EMAIL' && corpo.indicadoresRecalculados === false,
  )

  const historico = await testarApi(
    '5.11',
    'Histórico da resposta',
    { metodo: 'GET', caminho: `${caminho}/historico`, token: tokenAdmin },
    200,
    '4 alterações do ADMINISTRADOR, a mais recente primeiro',
    (corpo) =>
      Array.isArray(corpo) &&
      corpo.length === 4 &&
      corpo.every((item: { autor: string }) => item.autor === 'ADMINISTRADOR') &&
      corpo[0].campo === 'preferenciaBoletim',
  )

  if (Array.isArray(historico.corpo)) {
    mostrarHistorico(historico.corpo)
  }
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
    '4': parte4Indicadores,
    '5': parte5Correcao,
  }

  await garantirApiNoAr()

  const selecionadas = parteEscolhida ? [parteEscolhida] : Object.keys(partes)
  for (const numero of selecionadas) {
    if (!partes[numero]) {
      console.log(vermelho(`Parte "${numero}" não existe. Use 1, 2, 3, 4 ou 5.`))
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
