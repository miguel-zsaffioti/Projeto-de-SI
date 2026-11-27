import { z } from 'zod'
import { periodoIdSchema, preferenciaBoletimSchema, taxaOcupacaoSchema } from '../formulario/formulario.schemas'

const vazioParaNulo = (valor: unknown) => (valor === '' ? null : valor)

export const correcaoSchema = z.discriminatedUnion(
  'campo',
  [
    z.object({
      campo: z.literal('taxaOcupacao'),
      periodoId: periodoIdSchema,
      valor: taxaOcupacaoSchema.nullable(),
    }),
    z.object({
      campo: z.literal('preferenciaBoletim'),
      valor: preferenciaBoletimSchema,
    }),
    z.object({
      campo: z.literal('emailConfirmacao'),
      valor: z.preprocess(vazioParaNulo, z.string().trim().toLowerCase().email('Informe um e-mail válido').nullable()),
    }),
  ],
  {
    errorMap: () => ({ message: 'O campo deve ser taxaOcupacao, preferenciaBoletim ou emailConfirmacao' }),
  },
)

export type Correcao = z.infer<typeof correcaoSchema>
