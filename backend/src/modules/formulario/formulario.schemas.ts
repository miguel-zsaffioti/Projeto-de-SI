import { z } from 'zod'

const vazioParaUndefined = (valor: unknown) => (valor === '' || valor === null ? undefined : valor)

export const periodoIdSchema = z
  .union([z.string().regex(/^\d+$/, 'Período inválido'), z.number().int().positive()])
  .transform(String)

export const taxaOcupacaoSchema = z
  .number({ required_error: 'Informe a taxa de ocupação', invalid_type_error: 'A taxa deve ser um número' })
  .min(0, 'A taxa deve estar entre 0 e 100')
  .max(100, 'A taxa deve estar entre 0 e 100')
  .transform((taxa) => Math.round(taxa * 100) / 100)

export const preferenciaBoletimSchema = z.enum(['NAO_QUERO', 'WHATSAPP', 'EMAIL', 'OUTRO'], {
  required_error: 'Escolha como deseja receber o boletim',
  invalid_type_error: 'Preferência de boletim inválida',
})

const ocupacaoSchema = z.object({
  periodoId: periodoIdSchema,
  taxaOcupacao: taxaOcupacaoSchema,
})

export const respostaSchema = z
  .object({
    ocupacoes: z.array(ocupacaoSchema, { required_error: 'Informe a taxa de ocupação de cada período' }),
    preferenciaBoletim: preferenciaBoletimSchema,
    emailConfirmacao: z.preprocess(
      vazioParaUndefined,
      z.string().trim().toLowerCase().email('Informe um e-mail válido').optional(),
    ),
  })
  .refine((dados) => dados.preferenciaBoletim !== 'EMAIL' || dados.emailConfirmacao, {
    path: ['emailConfirmacao'],
    message: 'Informe o e-mail para receber o boletim',
  })
  .transform((dados) => ({
    ...dados,
    emailConfirmacao: dados.preferenciaBoletim === 'EMAIL' ? dados.emailConfirmacao! : null,
  }))

export type DadosResposta = z.infer<typeof respostaSchema>
