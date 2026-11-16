import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { estabelecimentosExemplo, rhcExemplo } from './dados/inventario'
import { diariasMediasExemplo, percentualDayUseInicial } from './dados/parametros'

const prisma = new PrismaClient()

async function criarAdministrador() {
  const nome = process.env.ADMIN_NOME ?? 'Administrador OTO'
  const email = (process.env.ADMIN_EMAIL ?? 'admin@oto.local').toLowerCase()
  const senha = process.env.ADMIN_SENHA ?? 'Admin@123'

  const administrador = await prisma.administrador.upsert({
    where: { email },
    update: {},
    create: { nome, email, senhaHash: await bcrypt.hash(senha, 10) },
  })

  console.log(`Administrador: ${administrador.email}`)
  return administrador
}

async function criarInventario() {
  for (const dados of estabelecimentosExemplo) {
    const { contatos, ...campos } = dados

    const estabelecimento = await prisma.estabelecimento.upsert({
      where: { codigoInterno: campos.codigoInterno },
      update: { ...campos, atualizadoEm: new Date() },
      create: campos,
    })

    for (const contato of contatos) {
      await prisma.contatoEstabelecimento.upsert({
        where: {
          uq_contato_estabelecimento: {
            estabelecimentoId: estabelecimento.id,
            canal: contato.canal,
            valor: contato.valor,
          },
        },
        update: {},
        create: { ...contato, estabelecimentoId: estabelecimento.id, principal: true },
      })
    }
  }

  console.log(`Estabelecimentos no inventário: ${estabelecimentosExemplo.length}`)
}

async function criarRhc() {
  const existente = await prisma.inventarioRhc.findFirst()

  if (existente) {
    await prisma.inventarioRhc.update({
      where: { id: existente.id },
      data: { ...rhcExemplo, atualizadoEm: new Date() },
    })
  } else {
    await prisma.inventarioRhc.create({ data: rhcExemplo })
  }

  console.log(`RHC: ${rhcExemplo.totalUh} UH`)
}

async function criarParametrosDeCalculo(administradorId: bigint) {
  const conjuntoAtivo = await prisma.conjuntoParametrosCalculo.findFirst({ where: { ativo: true } })

  if (conjuntoAtivo) {
    console.log('Parâmetros de cálculo: conjunto ativo já existe, mantido')
    return
  }

  await prisma.conjuntoParametrosCalculo.create({
    data: {
      percentualDayUse: percentualDayUseInicial,
      ativo: true,
      criadoPor: administradorId,
      observacao: 'Valores iniciais de exemplo',
      parametrosDiaria: { create: diariasMediasExemplo },
    },
  })

  console.log(`Parâmetros de cálculo: day use ${percentualDayUseInicial}%`)
}

async function main() {
  const administrador = await criarAdministrador()
  await criarInventario()
  await criarRhc()
  await criarParametrosDeCalculo(administrador.id)
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
