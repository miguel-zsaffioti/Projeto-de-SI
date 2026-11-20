import 'dotenv/config'
import readline from 'readline/promises'
import { PrismaClient } from '@prisma/client'
import { criarPesquisaDemo } from '../prisma/seed-pesquisa-demo'
import { calcularPrazoPadrao, fimDoDiaNoBrasil } from '../src/lib/prazo'
import { calcularHashToken, gerarTokenConviteDeterministico } from '../src/lib/token'

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

async function parte4Pesquisas() {
  abrirParte(
    'PARTE 4 · Criar pesquisa e gerar links únicos (UC02 e UC03)',
    'Cria pesquisas pela API como administrador e confere os links gerados e o que fica no banco.',
  )

  const login = await chamarApi({
    metodo: 'POST',
    caminho: '/api/auth/login',
    corpo: { email: 'admin@oto.local', senha: 'Admin@123' },
  })
  const token: string = login.corpo.token

  const sufixo = Date.now()
  const periodoValido = { nome: `Teste Pesquisas ${sufixo}`, dataInicio: '2026-10-01', dataFim: '2026-10-31', tipoDado: 'REALIZADO' }
  const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  await testarApi(
    '4.1',
    'Criar pesquisa sem estar logado',
    { metodo: 'POST', caminho: '/api/pesquisas', corpo: { tipo: 'CONSOLIDADA', periodos: [periodoValido] } },
    401,
    'NAO_AUTENTICADO',
    (corpo) => corpo.codigo === 'NAO_AUTENTICADO',
  )

  await testarApi(
    '4.2',
    'Prazo sugerido pelo sistema (5 dias úteis)',
    { metodo: 'GET', caminho: '/api/pesquisas/prazo-sugerido', token },
    200,
    'uma data futura que cai em dia útil',
    (corpo) => {
      const diaDaSemana = new Date(`${corpo.data}T12:00:00Z`).getUTCDay()
      return corpo.data > new Date().toISOString().slice(0, 10) && diaDaSemana >= 1 && diaDaSemana <= 5
    },
  )

  await testarApi(
    '4.3',
    'Período com data de fim anterior à de início',
    {
      metodo: 'POST',
      caminho: '/api/pesquisas',
      token,
      corpo: { tipo: 'CONSOLIDADA', periodos: [{ ...periodoValido, dataInicio: '2026-10-31', dataFim: '2026-10-01' }] },
    },
    400,
    'DADOS_INVALIDOS apontando periodos.0.dataFim',
    (corpo) => corpo.codigo === 'DADOS_INVALIDOS' && corpo.campos?.[0]?.campo === 'periodos.0.dataFim',
  )

  await testarApi(
    '4.4',
    'Pesquisa sem nenhum período',
    { metodo: 'POST', caminho: '/api/pesquisas', token, corpo: { tipo: 'CONSOLIDADA', periodos: [] } },
    400,
    'DADOS_INVALIDOS apontando periodos',
    (corpo) => corpo.campos?.[0]?.campo === 'periodos',
  )

  await testarApi(
    '4.5',
    'Prazo de resposta no passado',
    {
      metodo: 'POST',
      caminho: '/api/pesquisas',
      token,
      corpo: { tipo: 'CONSOLIDADA', periodos: [periodoValido], prazoResposta: '2020-01-01' },
    },
    400,
    'DADOS_INVALIDOS apontando prazoResposta',
    (corpo) => corpo.campos?.[0]?.campo === 'prazoResposta',
  )

  await testarApi(
    '4.6',
    'Mesmo período informado duas vezes',
    { metodo: 'POST', caminho: '/api/pesquisas', token, corpo: { tipo: 'CONSOLIDADA', periodos: [periodoValido, periodoValido] } },
    400,
    'DADOS_INVALIDOS apontando periodos.1',
    (corpo) => corpo.campos?.[0]?.campo === 'periodos.1',
  )

  const consolidada = await testarApi(
    '4.7',
    'Criar pesquisa Consolidada com 1 período e sem prazo (usa o padrão)',
    { metodo: 'POST', caminho: '/api/pesquisas', token, corpo: { tipo: 'CONSOLIDADA', periodos: [periodoValido] } },
    201,
    'pesquisa ABERTA e 13 convites, cada um com um link diferente',
    (corpo) =>
      corpo.pesquisa?.tipo === 'CONSOLIDADA' &&
      corpo.pesquisa?.status === 'ABERTA' &&
      corpo.totalConvites === 13 &&
      new Set(corpo.convites.map((convite: { link: string }) => convite.link)).size === 13,
  )

  const pesquisaCriada = consolidada.corpo?.pesquisa
  const primeiroConvite = consolidada.corpo?.convites?.[0]
  const tokenDoLink: string = primeiroConvite?.link?.split('/responder/')[1] ?? ''

  await testar('4.8', 'Prazo padrão: 5 dias úteis depois da abertura, até o fim do dia', async () => {
    const esperado = calcularPrazoPadrao(new Date(pesquisaCriada.abertaEm)).prazo.toISOString()
    const recebido = new Date(pesquisaCriada.prazoResposta).toISOString()
    return { passou: recebido === esperado, esperado, recebido }
  })

  await testar('4.9', 'No banco fica só o hash do token (nunca o link) e o convite nasce PENDENTE', async () => {
    const convite = await prisma.convitePesquisa.findUnique({ where: { tokenHash: calcularHashToken(tokenDoLink) } })
    const total = await prisma.convitePesquisa.count({ where: { pesquisaId: BigInt(pesquisaCriada.id) } })
    return {
      passou: !!convite && convite.status === 'PENDENTE' && convite.tokenHash !== tokenDoLink && total === 13,
      esperado: '13 convites PENDENTE e tokenHash = sha256(token do link)',
      recebido: convite ? `${total} convites · primeiro ${convite.status} · hash ${convite.tokenHash.slice(0, 12)}...` : 'convite não encontrado',
    }
  })

  await testarApi(
    '4.10',
    'O link gerado abre o formulário do estabelecimento certo',
    { metodo: 'GET', caminho: `/api/formulario/${tokenDoLink}` },
    200,
    `nome fantasia "${primeiroConvite?.estabelecimento?.nomeFantasia}" e 1 período`,
    (corpo) =>
      corpo.estabelecimento?.nomeFantasia === primeiroConvite.estabelecimento.nomeFantasia && corpo.periodos?.length === 1,
  )

  const expectativa = await testarApi(
    '4.11',
    'Criar pesquisa de Expectativa com 2 períodos e prazo informado',
    {
      metodo: 'POST',
      caminho: '/api/pesquisas',
      token,
      corpo: {
        tipo: 'EXPECTATIVA',
        prazoResposta: em30Dias,
        periodos: [
          { nome: `Finados Teste ${sufixo}`, dataInicio: '2026-10-31', dataFim: '2026-11-02', tipoDado: 'ESPERADO' },
          { nome: `Natal Teste ${sufixo}`, dataInicio: '2026-12-24', dataFim: '2026-12-26', tipoDado: 'ESPERADO' },
        ],
      },
    },
    201,
    'períodos na ordem 1 e 2 e prazo até o fim do dia informado',
    (corpo) =>
      corpo.pesquisa.tipo === 'EXPECTATIVA' &&
      corpo.pesquisa.periodos.map((periodo: { ordemExibicao: number }) => periodo.ordemExibicao).join(',') === '1,2' &&
      new Date(corpo.pesquisa.prazoResposta).toISOString() === fimDoDiaNoBrasil(em30Dias).toISOString(),
  )

  await testar('4.12', 'Reaproveita um período que já existe em vez de duplicar', async () => {
    await chamarApi({ metodo: 'POST', caminho: '/api/pesquisas', token, corpo: { tipo: 'CONSOLIDADA', periodos: [periodoValido] } })
    const total = await prisma.periodoReferencia.count({ where: { nome: periodoValido.nome } })
    return {
      passou: total === 1,
      esperado: '1 registro de período para duas pesquisas',
      recebido: `${total} registro(s) com o nome "${periodoValido.nome}"`,
    }
  })

  await testarApi(
    '4.13',
    'Listar as pesquisas',
    { metodo: 'GET', caminho: '/api/pesquisas', token },
    200,
    'a pesquisa do teste 4.7 com 13 convites, 0 respondidos e prazo não vencido',
    (corpo) => {
      const pesquisa = corpo.find((item: { id: string }) => item.id === pesquisaCriada.id)
      return !!pesquisa && pesquisa.totalConvites === 13 && pesquisa.totalRespondidos === 0 && pesquisa.totalPeriodos === 1 && pesquisa.prazoVencido === false
    },
  )

  await testarApi(
    '4.14',
    'Pesquisa Consolidada com período de dado ESPERADO',
    {
      metodo: 'POST',
      caminho: '/api/pesquisas',
      token,
      corpo: { tipo: 'CONSOLIDADA', periodos: [{ ...periodoValido, tipoDado: 'ESPERADO' }] },
    },
    400,
    'DADOS_INVALIDOS em periodos.0.tipoDado pedindo dado realizado',
    (corpo) => corpo.campos?.[0]?.campo === 'periodos.0.tipoDado' && corpo.campos[0].mensagem.includes('realizado'),
  )

  await testarApi(
    '4.15',
    'Pesquisa de Expectativa com período de dado REALIZADO',
    {
      metodo: 'POST',
      caminho: '/api/pesquisas',
      token,
      corpo: { tipo: 'EXPECTATIVA', periodos: [periodoValido] },
    },
    400,
    'DADOS_INVALIDOS em periodos.0.tipoDado pedindo dado esperado',
    (corpo) => corpo.campos?.[0]?.campo === 'periodos.0.tipoDado' && corpo.campos[0].mensagem.includes('esperado'),
  )

  await testar('4.16', 'Link reproduzível: mesmo estabelecimento tem link diferente em outra pesquisa', async () => {
    const segredo = process.env.LINK_TOKEN_SECRET || process.env.JWT_SECRET || ''
    const recalculado = gerarTokenConviteDeterministico(
      BigInt(pesquisaCriada.id),
      BigInt(primeiroConvite.estabelecimento.id),
      segredo,
    )
    const linkNaOutraPesquisa: string | undefined = expectativa.corpo.convites.find(
      (convite: { estabelecimento: { id: string } }) => convite.estabelecimento.id === primeiroConvite.estabelecimento.id,
    )?.link

    return {
      passou: recalculado === tokenDoLink && !!linkNaOutraPesquisa && !linkNaOutraPesquisa.endsWith(tokenDoLink),
      esperado: 'token recalculado com o segredo = token do link; na outra pesquisa o link é outro',
      recebido: `recalculado ${recalculado === tokenDoLink ? 'confere' : 'NÃO confere'} · outra pesquisa ${linkNaOutraPesquisa ? 'tem link diferente' : 'sem convite'}`,
    }
  })
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
    '4': parte4Pesquisas,
  }

  await garantirApiNoAr()

  const selecionadas = parteEscolhida ? [parteEscolhida] : Object.keys(partes)
  for (const numero of selecionadas) {
    if (!partes[numero]) {
      console.log(vermelho(`Parte "${numero}" não existe. Use 1, 2, 3 ou 4.`))
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
