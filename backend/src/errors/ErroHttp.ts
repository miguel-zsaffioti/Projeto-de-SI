export type CampoInvalido = {
  campo: string
  mensagem: string
}

export class ErroHttp extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly codigo?: string,
    public readonly campos?: CampoInvalido[],
  ) {
    super(mensagem)
  }
}
