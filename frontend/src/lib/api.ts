const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

export type CampoInvalido = {
  campo: string
  mensagem: string
}

type ErroResposta = {
  erro?: string
  codigo?: string
  campos?: CampoInvalido[]
}

export class ErroApi extends Error {
  codigo?: string
  campos?: CampoInvalido[]

  constructor(mensagem: string, codigo?: string, campos?: CampoInvalido[]) {
    super(mensagem)
    this.name = 'ErroApi'
    this.codigo = codigo
    this.campos = campos
  }
}

export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response

  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...opcoes.headers,
      },
    })
  } catch {
    throw new ErroApi('Não foi possível conectar ao sistema. Tente novamente.', 'REDE')
  }

  const texto = await resposta.text()
  let corpo: (T & ErroResposta) | null = null
  if (texto) {
    try {
      corpo = JSON.parse(texto) as T & ErroResposta
    } catch {
      throw new ErroApi('Resposta inválida do sistema.', 'RESPOSTA_INVALIDA')
    }
  }

  if (!resposta.ok) {
    const erro = corpo?.erro ?? 'Não foi possível concluir a operação.'
    const mensagem = corpo?.campos?.[0]?.mensagem ?? erro
    throw new ErroApi(mensagem, corpo?.codigo, corpo?.campos)
  }

  return corpo as T
}
