import { CanalContato, TipoHospedagem } from '@prisma/client'

type ContatoExemplo = {
  canal: CanalContato
  valor: string
}

export type EstabelecimentoExemplo = {
  codigoInterno: string
  nomeFantasia: string
  tipoHospedagem: TipoHospedagem
  totalUh: number
  leitosMinPorUh: number
  leitosMaxPorUh: number
  contatos: ContatoExemplo[]
}

function contatos(slug: string, telefone: string | null): ContatoExemplo[] {
  const lista: ContatoExemplo[] = [{ canal: 'EMAIL', valor: `contato@${slug}.example.com` }]
  if (telefone) {
    lista.push({ canal: 'WHATSAPP', valor: telefone })
  }
  return lista
}

export const estabelecimentosExemplo: EstabelecimentoExemplo[] = [
  {
    codigoInterno: 'MH-001',
    nomeFantasia: 'Resort Águas Quentes',
    tipoHospedagem: 'RESORT',
    totalUh: 420,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 6,
    contatos: contatos('aguasquentes', '5517999000001'),
  },
  {
    codigoInterno: 'MH-002',
    nomeFantasia: 'Resort Vale das Termas',
    tipoHospedagem: 'RESORT',
    totalUh: 310,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 5,
    contatos: contatos('valedastermas', '5517999000002'),
  },
  {
    codigoInterno: 'MH-003',
    nomeFantasia: 'Grand Resort Olímpia Park',
    tipoHospedagem: 'RESORT',
    totalUh: 560,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 6,
    contatos: contatos('olimpiapark', '5517999000003'),
  },
  {
    codigoInterno: 'MH-004',
    nomeFantasia: 'Hotel Central Olímpia',
    tipoHospedagem: 'HOTEL',
    totalUh: 85,
    leitosMinPorUh: 1,
    leitosMaxPorUh: 4,
    contatos: contatos('centralolimpia', '5517999000004'),
  },
  {
    codigoInterno: 'MH-005',
    nomeFantasia: 'Hotel Jardim das Palmeiras',
    tipoHospedagem: 'HOTEL',
    totalUh: 120,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 4,
    contatos: contatos('jardimdaspalmeiras', '5517999000005'),
  },
  {
    codigoInterno: 'MH-006',
    nomeFantasia: 'Hotel Solar do Turista',
    tipoHospedagem: 'HOTEL',
    totalUh: 64,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 3,
    contatos: contatos('solardoturista', null),
  },
  {
    codigoInterno: 'MH-007',
    nomeFantasia: 'Hotel Fazenda Recanto Verde',
    tipoHospedagem: 'OUTRO',
    totalUh: 48,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 5,
    contatos: contatos('recantoverde', '5517999000007'),
  },
  {
    codigoInterno: 'MH-008',
    nomeFantasia: 'Pousada Sol Nascente',
    tipoHospedagem: 'POUSADA',
    totalUh: 22,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 4,
    contatos: contatos('solnascente', '5517999000008'),
  },
  {
    codigoInterno: 'MH-009',
    nomeFantasia: 'Pousada Recanto das Flores',
    tipoHospedagem: 'POUSADA',
    totalUh: 18,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 3,
    contatos: contatos('recantodasflores', '5517999000009'),
  },
  {
    codigoInterno: 'MH-010',
    nomeFantasia: 'Pousada Caminho das Águas',
    tipoHospedagem: 'POUSADA',
    totalUh: 15,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 4,
    contatos: contatos('caminhodasaguas', '5517999000010'),
  },
  {
    codigoInterno: 'MH-011',
    nomeFantasia: 'Pousada Ipê Amarelo',
    tipoHospedagem: 'POUSADA',
    totalUh: 12,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 3,
    contatos: contatos('ipeamarelo', '5517999000011'),
  },
  {
    codigoInterno: 'MH-012',
    nomeFantasia: 'Flat Residence Olímpia',
    tipoHospedagem: 'FLAT',
    totalUh: 70,
    leitosMinPorUh: 2,
    leitosMaxPorUh: 5,
    contatos: contatos('flatresidence', '5517999000012'),
  },
  {
    codigoInterno: 'MH-013',
    nomeFantasia: 'Hostel Mochileiro Feliz',
    tipoHospedagem: 'HOSTEL',
    totalUh: 10,
    leitosMinPorUh: 4,
    leitosMaxPorUh: 8,
    contatos: contatos('mochileirofeliz', '5517999000013'),
  },
]

export const rhcExemplo = {
  totalUh: 850,
  leitosMinPorUh: 2,
  leitosMaxPorUh: 4,
}
