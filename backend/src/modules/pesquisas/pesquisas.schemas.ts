import { z } from 'zod'
import { diaIsoValido, interpretarPrazo } from '../../lib/prazo'

const vazioParaUndefined = (valor: unknown) => (valor === '' || valor === null ? undefined : valor)

const campoData = (rotulo: string) =>
  z
    .string({ required_error: `Informe ${rotulo}`, invalid_type_error: `Informe ${rotulo}` })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD')
    .refine(diaIsoValido, 'Data inválida')

const periodoSchema = z
  .object({
    nome: z
      .string({ required_error: 'Informe o nome do período', invalid_type_error: 'Informe o nome do período' })
      .trim()
      .min(1, 'Informe o nome do período')
      .max(160, 'O nome deve ter no máximo 160 caracteres'),
    dataInicio: campoData('a data de início'),
    dataFim: campoData('a data de fim'),
    tipoDado: z.enum(['REALIZADO', 'ESPERADO'], {
      required_error: 'Informe se o dado é realizado ou esperado',
      invalid_type_error: 'Tipo de dado inválido',
    }),
  })
  .refine((periodo) => periodo.dataFim >= periodo.dataInicio, {
    path: ['dataFim'],
    message: 'A data de fim não pode ser anterior à data de início',
  })

const prazoRespostaSchema = z.preprocess(
  vazioParaUndefined,
  z
    .string({ invalid_type_error: 'Prazo inválido' })
    .trim()
    .transform((valor, ctx) => {
      const prazo = interpretarPrazo(valor)
      if (!prazo) {
        ctx.addIssue({ code: 'custom', message: 'Informe o prazo em AAAA-MM-DD ou em data e hora ISO' })
        return z.NEVER
      }
      if (prazo.getTime() <= Date.now()) {
        ctx.addIssue({ code: 'custom', message: 'O prazo de resposta deve ser uma data futura' })
        return z.NEVER
      }
      return prazo
    })
    .optional(),
)

export const criarPesquisaSchema = z
  .object({
    tipo: z.enum(['CONSOLIDADA', 'EXPECTATIVA'], {
      required_error: 'Escolha o tipo da pesquisa',
      invalid_type_error: 'Tipo de pesquisa inválido',
    }),
    periodos: z
      .array(periodoSchema, {
        required_error: 'Adicione ao menos um período',
        invalid_type_error: 'Períodos inválidos',
      })
      .min(1, 'Adicione ao menos um período'),
    prazoResposta: prazoRespostaSchema,
  })
  .superRefine((dados, ctx) => {
    // Consolidada trabalha com dado realizado; Expectativa, com dado esperado (RF02 / UC02 A1 e A2).
    const tipoDadoEsperado = dados.tipo === 'CONSOLIDADA' ? 'REALIZADO' : 'ESPERADO'
    const mensagem =
      dados.tipo === 'CONSOLIDADA'
        ? 'Em uma pesquisa Consolidada, todos os períodos devem ser de dado realizado'
        : 'Em uma pesquisa de Expectativa, todos os períodos devem ser de dado esperado'

    dados.periodos.forEach((periodo, indice) => {
      if (periodo.tipoDado !== tipoDadoEsperado) {
        ctx.addIssue({ code: 'custom', path: ['periodos', indice, 'tipoDado'], message: mensagem })
      }
    })

    const vistos = new Set<string>()

    dados.periodos.forEach((periodo, indice) => {
      const chave = JSON.stringify([periodo.nome, periodo.dataInicio, periodo.dataFim, periodo.tipoDado])
      if (vistos.has(chave)) {
        ctx.addIssue({ code: 'custom', path: ['periodos', indice], message: 'Período repetido nesta pesquisa' })
      }
      vistos.add(chave)
    })
  })

export type DadosCriarPesquisa = z.infer<typeof criarPesquisaSchema>
