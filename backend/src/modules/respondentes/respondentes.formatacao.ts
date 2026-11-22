import { ErroHttp } from '../../errors/ErroHttp'

export function criarMensagemWhatsApp(nome: string, link: string) {
  return `Olá, ${nome}! Responda à pesquisa do OTO pelo link: ${link}`
}

export function criarLinkWhatsApp(numero: string, mensagem: string) {
  const telefone = numero.replace(/\D/g, '')
  if (telefone.length < 10 || telefone.length > 15) {
    throw new ErroHttp(422, 'O número de WhatsApp cadastrado é inválido.', 'CONTATO_INVALIDO')
  }
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`
}
