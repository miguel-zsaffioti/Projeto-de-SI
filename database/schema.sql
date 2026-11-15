-- Olympia Tourist System (OTO) - Modulo de Pesquisas
-- Banco relacional: PostgreSQL
-- Baseado no Documento de Casos de Uso, versao 01/11/2026.
-- O inventario e carregado previamente; sua manutencao nao faz parte desta entrega.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------
CREATE TYPE tipo_pesquisa AS ENUM ('CONSOLIDADA', 'EXPECTATIVA');
CREATE TYPE status_pesquisa AS ENUM ('ABERTA', 'ENCERRADA', 'CANCELADA');
CREATE TYPE tipo_dado_periodo AS ENUM ('REALIZADO', 'ESPERADO');
CREATE TYPE tipo_hospedagem AS ENUM ('HOTEL', 'RESORT', 'POUSADA', 'FLAT', 'HOSTEL', 'OUTRO');
CREATE TYPE canal_contato AS ENUM ('EMAIL', 'WHATSAPP', 'OUTRO');
CREATE TYPE status_convite AS ENUM ('PENDENTE', 'ENVIADO', 'RESPONDIDO');
CREATE TYPE canal_envio AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE status_envio AS ENUM ('PREPARADO', 'ENVIADO', 'FALHOU');
CREATE TYPE preferencia_boletim AS ENUM ('NAO_QUERO', 'WHATSAPP', 'EMAIL', 'OUTRO');
CREATE TYPE tipo_autor_alteracao AS ENUM ('ESTABELECIMENTO', 'ADMINISTRADOR');
CREATE TYPE metodo_diaria AS ENUM ('ARITMETICA', 'PONDERADA');
CREATE TYPE categoria_diaria AS ENUM ('HOTEL', 'RESORT', 'POUSADA', 'GERAL');
CREATE TYPE status_calculo AS ENUM ('EM_EXECUCAO', 'CONCLUIDO', 'FALHOU');
CREATE TYPE status_importacao AS ENUM ('PREVIA', 'IMPORTADA', 'FALHOU');

-- -----------------------------------------------------------------------------
-- 2. Administradores e inventario de meios de hospedagem
-- -----------------------------------------------------------------------------
CREATE TABLE administrador (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome                VARCHAR(150) NOT NULL,
    email               VARCHAR(254) NOT NULL UNIQUE,
    senha_hash          TEXT NOT NULL,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estabelecimento (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_interno          VARCHAR(80) NOT NULL UNIQUE,
    nome_fantasia           VARCHAR(200) NOT NULL,
    tipo_hospedagem         tipo_hospedagem NOT NULL,
    total_uh                INTEGER NOT NULL CHECK (total_uh >= 0),
    leitos_min_por_uh       NUMERIC(7,2),
    leitos_max_por_uh       NUMERIC(7,2),
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_estabelecimento_leitos
        CHECK (
            (leitos_min_por_uh IS NULL AND leitos_max_por_uh IS NULL)
            OR
            (leitos_min_por_uh >= 0 AND leitos_max_por_uh >= leitos_min_por_uh)
        )
);

CREATE TABLE contato_estabelecimento (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estabelecimento_id  BIGINT NOT NULL REFERENCES estabelecimento(id) ON DELETE CASCADE,
    canal               canal_contato NOT NULL,
    valor               VARCHAR(254) NOT NULL,
    principal           BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contato_estabelecimento UNIQUE (estabelecimento_id, canal, valor)
);

CREATE UNIQUE INDEX uq_contato_principal_por_canal
    ON contato_estabelecimento (estabelecimento_id, canal)
    WHERE principal = TRUE;

CREATE TABLE inventario_rhc (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    total_uh                INTEGER NOT NULL CHECK (total_uh >= 0),
    leitos_min_por_uh       NUMERIC(7,2) NOT NULL CHECK (leitos_min_por_uh >= 0),
    leitos_max_por_uh       NUMERIC(7,2) NOT NULL,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_rhc_leitos CHECK (leitos_max_por_uh >= leitos_min_por_uh)
);

-- -----------------------------------------------------------------------------
-- 3. Pesquisas e periodos
-- -----------------------------------------------------------------------------
CREATE TABLE pesquisa (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo                tipo_pesquisa NOT NULL,
    status              status_pesquisa NOT NULL DEFAULT 'ABERTA',
    criada_por          BIGINT NOT NULL REFERENCES administrador(id),
    aberta_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prazo_resposta      TIMESTAMPTZ NOT NULL,
    encerrada_em        TIMESTAMPTZ,
    criada_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_pesquisa_prazo CHECK (prazo_resposta > aberta_em),
    CONSTRAINT ck_pesquisa_encerramento
        CHECK (status <> 'ENCERRADA' OR encerrada_em IS NOT NULL)
);

CREATE TABLE periodo_referencia (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome                VARCHAR(160) NOT NULL,
    data_inicio         DATE NOT NULL,
    data_fim            DATE NOT NULL,
    tipo_dado           tipo_dado_periodo NOT NULL,
    CONSTRAINT ck_periodo_datas CHECK (data_fim >= data_inicio),
    CONSTRAINT uq_periodo_referencia UNIQUE (nome, data_inicio, data_fim, tipo_dado)
);

CREATE TABLE pesquisa_periodo (
    pesquisa_id         BIGINT NOT NULL REFERENCES pesquisa(id) ON DELETE CASCADE,
    periodo_id          BIGINT NOT NULL REFERENCES periodo_referencia(id),
    ordem_exibicao      INTEGER NOT NULL CHECK (ordem_exibicao > 0),
    PRIMARY KEY (pesquisa_id, periodo_id),
    CONSTRAINT uq_pesquisa_ordem_periodo UNIQUE (pesquisa_id, ordem_exibicao)
);

CREATE INDEX ix_pesquisa_status_prazo ON pesquisa (status, prazo_resposta);

-- -----------------------------------------------------------------------------
-- 4. Convites, links unicos e tentativas de envio
-- -----------------------------------------------------------------------------
CREATE TABLE convite_pesquisa (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pesquisa_id         BIGINT NOT NULL REFERENCES pesquisa(id) ON DELETE CASCADE,
    estabelecimento_id  BIGINT NOT NULL REFERENCES estabelecimento(id),
    token_hash          CHAR(64) NOT NULL UNIQUE,
    status              status_convite NOT NULL DEFAULT 'PENDENTE',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_envio_em     TIMESTAMPTZ,
    CONSTRAINT uq_convite_pesquisa_estabelecimento UNIQUE (pesquisa_id, estabelecimento_id),
    CONSTRAINT uq_convite_identidade UNIQUE (id, pesquisa_id, estabelecimento_id)
);

CREATE TABLE tentativa_envio (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    convite_id              BIGINT NOT NULL REFERENCES convite_pesquisa(id) ON DELETE CASCADE,
    canal                   canal_envio NOT NULL,
    status                  status_envio NOT NULL,
    iniciado_por            BIGINT REFERENCES administrador(id),
    tentado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mensagem_erro           TEXT,
    identificador_provedor  VARCHAR(200),
    CONSTRAINT ck_tentativa_whatsapp
        CHECK (canal <> 'WHATSAPP' OR status = 'PREPARADO')
);

CREATE INDEX ix_convite_pesquisa_status ON convite_pesquisa (pesquisa_id, status);
CREATE INDEX ix_tentativa_envio_convite ON tentativa_envio (convite_id, tentado_em DESC);

-- -----------------------------------------------------------------------------
-- 5. Respostas e taxas de ocupacao por periodo
-- -----------------------------------------------------------------------------
CREATE TABLE resposta_pesquisa (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pesquisa_id             BIGINT NOT NULL,
    estabelecimento_id      BIGINT NOT NULL,
    convite_id              BIGINT NOT NULL UNIQUE,
    enviada_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizada_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    preferencia_boletim     preferencia_boletim NOT NULL,
    email_confirmacao       VARCHAR(254),
    CONSTRAINT uq_resposta_pesquisa_estabelecimento
        UNIQUE (pesquisa_id, estabelecimento_id),
    CONSTRAINT uq_resposta_identidade UNIQUE (id, pesquisa_id),
    CONSTRAINT fk_resposta_convite
        FOREIGN KEY (convite_id, pesquisa_id, estabelecimento_id)
        REFERENCES convite_pesquisa (id, pesquisa_id, estabelecimento_id),
    CONSTRAINT ck_resposta_email_boletim
        CHECK (preferencia_boletim <> 'EMAIL' OR email_confirmacao IS NOT NULL)
);

CREATE TABLE resposta_ocupacao (
    resposta_id         BIGINT NOT NULL,
    pesquisa_id         BIGINT NOT NULL,
    periodo_id          BIGINT NOT NULL,
    taxa_ocupacao       NUMERIC(5,2),
    PRIMARY KEY (resposta_id, periodo_id),
    CONSTRAINT fk_ocupacao_resposta
        FOREIGN KEY (resposta_id, pesquisa_id)
        REFERENCES resposta_pesquisa (id, pesquisa_id) ON DELETE CASCADE,
    CONSTRAINT fk_ocupacao_periodo_pesquisa
        FOREIGN KEY (pesquisa_id, periodo_id)
        REFERENCES pesquisa_periodo (pesquisa_id, periodo_id) ON DELETE CASCADE,
    CONSTRAINT ck_taxa_ocupacao
        CHECK (taxa_ocupacao IS NULL OR taxa_ocupacao BETWEEN 0 AND 100)
);

CREATE INDEX ix_resposta_pesquisa_enviada ON resposta_pesquisa (pesquisa_id, enviada_em);

-- -----------------------------------------------------------------------------
-- 6. Historico de retificacoes e correcoes
-- -----------------------------------------------------------------------------
CREATE TABLE historico_resposta (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resposta_id             BIGINT NOT NULL REFERENCES resposta_pesquisa(id) ON DELETE CASCADE,
    periodo_id              BIGINT,
    campo_alterado          VARCHAR(100) NOT NULL,
    valor_anterior          TEXT,
    valor_novo              TEXT,
    tipo_autor              tipo_autor_alteracao NOT NULL,
    administrador_id        BIGINT REFERENCES administrador(id),
    alterado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_historico_ocupacao
        FOREIGN KEY (resposta_id, periodo_id)
        REFERENCES resposta_ocupacao (resposta_id, periodo_id),
    CONSTRAINT ck_historico_autor
        CHECK (
            (tipo_autor = 'ESTABELECIMENTO' AND administrador_id IS NULL)
            OR
            (tipo_autor = 'ADMINISTRADOR' AND administrador_id IS NOT NULL)
        )
);

CREATE INDEX ix_historico_resposta_data
    ON historico_resposta (resposta_id, alterado_em DESC);

-- -----------------------------------------------------------------------------
-- 7. Parametros de calculo
-- -----------------------------------------------------------------------------
CREATE TABLE conjunto_parametros_calculo (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    percentual_day_use      NUMERIC(5,2) NOT NULL
        CHECK (percentual_day_use >= 0 AND percentual_day_use < 100),
    ativo                   BOOLEAN NOT NULL DEFAULT FALSE,
    criado_por              BIGINT NOT NULL REFERENCES administrador(id),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observacao              TEXT
);

CREATE UNIQUE INDEX uq_um_conjunto_parametros_ativo
    ON conjunto_parametros_calculo (ativo)
    WHERE ativo = TRUE;

CREATE TABLE parametro_diaria_media (
    conjunto_parametros_id  BIGINT NOT NULL
        REFERENCES conjunto_parametros_calculo(id) ON DELETE CASCADE,
    categoria               categoria_diaria NOT NULL,
    metodo                  metodo_diaria NOT NULL,
    valor_diaria_media      NUMERIC(12,2) NOT NULL CHECK (valor_diaria_media >= 0),
    PRIMARY KEY (conjunto_parametros_id, categoria, metodo)
);

-- -----------------------------------------------------------------------------
-- 8. Execucoes de calculo e indicadores calculados
-- -----------------------------------------------------------------------------
CREATE TABLE execucao_calculo (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pesquisa_id             BIGINT NOT NULL,
    periodo_id              BIGINT NOT NULL,
    conjunto_parametros_id  BIGINT NOT NULL REFERENCES conjunto_parametros_calculo(id),
    executado_por           BIGINT NOT NULL REFERENCES administrador(id),
    status                  status_calculo NOT NULL DEFAULT 'EM_EXECUCAO',
    calculado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mensagem_erro           TEXT,
    CONSTRAINT fk_execucao_pesquisa_periodo
        FOREIGN KEY (pesquisa_id, periodo_id)
        REFERENCES pesquisa_periodo (pesquisa_id, periodo_id),
    CONSTRAINT uq_execucao_identidade UNIQUE (id, pesquisa_id, periodo_id)
);

CREATE TABLE indicador_calculado (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execucao_calculo_id     BIGINT NOT NULL REFERENCES execucao_calculo(id) ON DELETE CASCADE,
    codigo_indicador        VARCHAR(100) NOT NULL,
    chave_dimensao          VARCHAR(100) NOT NULL DEFAULT 'TOTAL',
    valor                   NUMERIC(20,6) NOT NULL,
    unidade                 VARCHAR(40) NOT NULL,
    CONSTRAINT uq_indicador_calculado
        UNIQUE (execucao_calculo_id, codigo_indicador, chave_dimensao)
);

CREATE INDEX ix_execucao_calculo_periodo
    ON execucao_calculo (pesquisa_id, periodo_id, calculado_em DESC);

-- -----------------------------------------------------------------------------
-- 9. Importacao de indicadores historicos
-- -----------------------------------------------------------------------------
CREATE TABLE importacao_historica (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    administrador_id        BIGINT NOT NULL REFERENCES administrador(id),
    nome_arquivo            VARCHAR(255) NOT NULL,
    hash_arquivo_sha256     CHAR(64),
    status                  status_importacao NOT NULL DEFAULT 'PREVIA',
    enviada_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    importada_em            TIMESTAMPTZ,
    detalhes                JSONB,
    CONSTRAINT ck_importacao_data
        CHECK (status <> 'IMPORTADA' OR importada_em IS NOT NULL)
);

CREATE TABLE indicador_historico (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    importacao_id           BIGINT NOT NULL REFERENCES importacao_historica(id) ON DELETE CASCADE,
    periodo_id              BIGINT NOT NULL REFERENCES periodo_referencia(id),
    codigo_indicador        VARCHAR(100) NOT NULL,
    chave_dimensao          VARCHAR(100) NOT NULL DEFAULT 'TOTAL',
    valor                   NUMERIC(20,6) NOT NULL,
    unidade                 VARCHAR(40) NOT NULL,
    CONSTRAINT uq_indicador_historico
        UNIQUE (importacao_id, periodo_id, codigo_indicador, chave_dimensao)
);

CREATE INDEX ix_indicador_historico_periodo
    ON indicador_historico (periodo_id, codigo_indicador);

-- -----------------------------------------------------------------------------
-- 10. Views de apoio ao sistema
-- -----------------------------------------------------------------------------
CREATE VIEW vw_acompanhamento_pesquisa AS
SELECT
    p.id AS pesquisa_id,
    p.tipo AS tipo_pesquisa,
    p.status AS status_pesquisa,
    e.id AS estabelecimento_id,
    e.codigo_interno,
    e.nome_fantasia,
    cp.status AS status_convite,
    cp.ultimo_envio_em,
    rp.id AS resposta_id,
    rp.enviada_em AS respondida_em
FROM convite_pesquisa cp
JOIN pesquisa p ON p.id = cp.pesquisa_id
JOIN estabelecimento e ON e.id = cp.estabelecimento_id
LEFT JOIN resposta_pesquisa rp ON rp.convite_id = cp.id;

CREATE VIEW vw_indicadores_exportacao AS
SELECT
    pr.id AS periodo_id,
    pr.nome AS periodo_nome,
    pr.data_inicio,
    pr.data_fim,
    'CALCULADO'::VARCHAR(20) AS origem,
    ec.id AS registro_origem_id,
    ec.calculado_em AS registrado_em,
    ic.codigo_indicador,
    ic.chave_dimensao,
    ic.valor,
    ic.unidade
FROM indicador_calculado ic
JOIN execucao_calculo ec ON ec.id = ic.execucao_calculo_id
JOIN pesquisa_periodo pp
  ON pp.pesquisa_id = ec.pesquisa_id AND pp.periodo_id = ec.periodo_id
JOIN periodo_referencia pr ON pr.id = pp.periodo_id
WHERE ec.status = 'CONCLUIDO'
UNION ALL
SELECT
    pr.id AS periodo_id,
    pr.nome AS periodo_nome,
    pr.data_inicio,
    pr.data_fim,
    'IMPORTADO'::VARCHAR(20) AS origem,
    ih.id AS registro_origem_id,
    imp.importada_em AS registrado_em,
    ih.codigo_indicador,
    ih.chave_dimensao,
    ih.valor,
    ih.unidade
FROM indicador_historico ih
JOIN importacao_historica imp ON imp.id = ih.importacao_id
JOIN periodo_referencia pr ON pr.id = ih.periodo_id
WHERE imp.status = 'IMPORTADA';

COMMIT;

