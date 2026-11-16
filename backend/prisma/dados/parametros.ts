import { CategoriaDiaria, MetodoDiaria } from '@prisma/client'

type DiariaMediaExemplo = {
  categoria: CategoriaDiaria
  metodo: MetodoDiaria
  valorDiariaMedia: number
}

export const percentualDayUseInicial = 15.15

export const diariasMediasExemplo: DiariaMediaExemplo[] = [
  { categoria: 'HOTEL', metodo: 'ARITMETICA', valorDiariaMedia: 320 },
  { categoria: 'HOTEL', metodo: 'PONDERADA', valorDiariaMedia: 345 },
  { categoria: 'RESORT', metodo: 'ARITMETICA', valorDiariaMedia: 780 },
  { categoria: 'RESORT', metodo: 'PONDERADA', valorDiariaMedia: 820 },
  { categoria: 'POUSADA', metodo: 'ARITMETICA', valorDiariaMedia: 210 },
  { categoria: 'POUSADA', metodo: 'PONDERADA', valorDiariaMedia: 225 },
  { categoria: 'GERAL', metodo: 'ARITMETICA', valorDiariaMedia: 430 },
  { categoria: 'GERAL', metodo: 'PONDERADA', valorDiariaMedia: 470 },
]
