import { Prisma } from '@prisma/client'
import nodemailer from 'nodemailer'
import { ErroHttp } from '../../errors/ErroHttp'
import { prisma } from '../../lib/prisma'
import { calcularHashToken } from '../../lib/token'
import { env } from '../../config/env'
import { DadosReenvio } from './respondentes.schemas'
import { criarLinkWhatsApp, criarMensagemWhatsApp } from './respondentes.formatacao'

const pesquisaComConvites = Prisma.validator<Prisma.PesquisaDefaultArgs>()({
  include: {
    convites: {
      include: {
        estabelecimento: { include: { contatos: true } },
        resposta: { select: { enviadaEm: true } },
      },
      orderBy: { estabelecimento: { nomeFantasia: 'asc' } },
    },
  },
})

type PesquisaComConvites = Prisma.PesquisaGetPayload<typeof pesquisaComConvites>

function contatoDoCanal(convite: PesquisaComConvites['convites'][number], canal: DadosReenvio['canal']) {
  const contato = convite.estabelecimento.contatos.find((item) => item.canal === canal)
  if (!contato) {
    throw new ErroHttp(
      422,
      `${convite.estabelecimento.nomeFantasia} não possui contato de ${canal === 'EMAIL' ? 'e-mail' : 'WhatsApp'}.`,
      'CONTATO_NAO_ENCONTRADO',
    )
  }
  return contato.valor
}

function apresentarConvite(convite: PesquisaComConvites['convites'][number]) {
  const status = convite.resposta ? 'RESPONDIDO' : 'PENDENTE'
  return {
    id: convite.id.toString(),
    estabelecimento: {
      id: convite.estabelecimento.id.toString(),
      nomeFantasia: convite.estabelecimento.nomeFantasia,
      tipoHospedagem: convite.estabelecimento.tipoHospedagem,
    },
    status,
    respondidoEm: convite.resposta?.enviadaEm ?? null,
    ultimoEnvioEm: convite.ultimoEnvioEm,
    contatos: convite.estabelecimento.contatos.map(({ canal, valor, principal }) => ({ canal, valor, principal })),
  }
}

async function buscarPesquisa(pesquisaId: bigint): Promise<PesquisaComConvites> {
  const pesquisa = await prisma.pesquisa.findUnique({ where: { id: pesquisaId }, ...pesquisaComConvites })
  if (!pesquisa) throw new ErroHttp(404, 'Pesquisa não encontrada', 'PESQUISA_NAO_ENCONTRADA')
  return pesquisa
}

export async function listarRespondentes(pesquisaId: bigint) {
  const pesquisa = await buscarPesquisa(pesquisaId)
  const convites = pesquisa.convites.map(apresentarConvite)
  return {
    pesquisa: {
      id: pesquisa.id.toString(),
      tipo: pesquisa.tipo,
      status: pesquisa.status,
      prazoResposta: pesquisa.prazoResposta,
    },
    resumo: {
      total: convites.length,
      respondentes: convites.filter(({ status }) => status === 'RESPONDIDO').length,
      pendentes: convites.filter(({ status }) => status === 'PENDENTE').length,
    },
    respondentes: convites,
  }
}

function criarTransportador() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    throw new ErroHttp(
      503,
      'Envio de e-mail indisponível. Configure SMTP_HOST, SMTP_USER e SMTP_PASS.',
      'SMTP_NAO_CONFIGURADO',
    )
  }
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  })
}

async function enviarEmail(destinatario: string, nome: string, link: string) {
  const transportador = criarTransportador()
  await transportador.sendMail({
    from: env.smtp.from,
    to: destinatario,
    subject: 'Link para responder a pesquisa do OTO',
    text: `Olá, ${nome}. Responda à pesquisa do OTO pelo link: ${link}`,
  })
}

export async function reenviarLinks(pesquisaId: bigint, administradorId: bigint, dados: DadosReenvio) {
  const pesquisa = await buscarPesquisa(pesquisaId)
  if (pesquisa.status !== 'ABERTA') {
    throw new ErroHttp(422, 'Só é possível reenviar links de pesquisas abertas.', 'PESQUISA_ENCERRADA')
  }

  const ids = dados.conviteIds.map((id) => BigInt(id))
  const convites = pesquisa.convites.filter((convite) => ids.includes(convite.id))
  if (convites.length !== ids.length) {
    throw new ErroHttp(400, 'Um ou mais convites não pertencem a esta pesquisa.', 'CONVITE_INVALIDO')
  }
  if (convites.some((convite) => convite.resposta)) {
    throw new ErroHttp(422, 'Selecione apenas estabelecimentos pendentes.', 'RESPONDENTE_JA_RESPONDEU')
  }

  const resultados = []
  for (const convite of convites) {
    const contato = contatoDoCanal(convite, dados.canal)
    const token = dados.tokens[convite.id.toString()]
    if (!token || calcularHashToken(token) !== convite.tokenHash) {
      throw new ErroHttp(422, `Token original ausente ou inválido para ${convite.estabelecimento.nomeFantasia}.`, 'TOKEN_INVALIDO')
    }
    const link = `${env.baseUrl}/responder/${token}`
    if (dados.canal === 'EMAIL') await enviarEmail(contato, convite.estabelecimento.nomeFantasia, link)
    const mensagemWhatsApp =
      dados.canal === 'WHATSAPP' ? criarMensagemWhatsApp(convite.estabelecimento.nomeFantasia, link) : null
    const linkWhatsApp = mensagemWhatsApp ? criarLinkWhatsApp(contato, mensagemWhatsApp) : null

    await prisma.$transaction([
      prisma.tentativaEnvio.create({
        data: { conviteId: convite.id, canal: dados.canal, status: dados.canal === 'EMAIL' ? 'ENVIADO' : 'PREPARADO', iniciadoPor: administradorId },
      }),
      prisma.convitePesquisa.update({ where: { id: convite.id }, data: { status: 'ENVIADO', ultimoEnvioEm: new Date() } }),
    ])
    resultados.push({
      conviteId: convite.id.toString(),
      estabelecimento: convite.estabelecimento.nomeFantasia,
      canal: dados.canal,
      link: dados.canal === 'WHATSAPP' ? link : undefined,
      mensagem: mensagemWhatsApp ?? `Link enviado para ${contato}`,
      linkWhatsApp,
    })
  }
  return { resultados }
}
