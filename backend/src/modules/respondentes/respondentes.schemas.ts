import { z } from 'zod'

export const reenviarSchema = z.object({
  conviteIds: z.array(z.string().regex(/^\d+$/, 'Convite inválido')).min(1, 'Selecione ao menos um estabelecimento'),
  canal: z.enum(['EMAIL', 'WHATSAPP']),
  tokens: z.record(z.string().regex(/^\d+$/, 'Convite inválido'), z.string().min(1, 'Token obrigatório')),
})

export type DadosReenvio = z.infer<typeof reenviarSchema>
