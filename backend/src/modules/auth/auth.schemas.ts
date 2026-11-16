import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Informe o e-mail' })
    .trim()
    .toLowerCase()
    .email('Informe um e-mail válido'),
  senha: z.string({ required_error: 'Informe a senha' }).min(1, 'Informe a senha'),
})

export type DadosLogin = z.infer<typeof loginSchema>
