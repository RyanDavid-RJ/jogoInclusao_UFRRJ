-- ============================================================================
-- Migration 002: Contas (Google OAuth / RBAC), Turmas, Matrizes de Equidade,
--                Governança de Perguntas e Telemetria Analítica de Partidas
-- Alvo: MySQL 8.0 / 8.4 (utf8mb4_unicode_ci)
-- Pré-requisito: Migration 001 aplicada (ou tabela `perguntas` existente limpa
--                sem duplicatas de etapa_escolar + nivel_estrutural + enunciado).
--
-- Verificação recomendada ANTES de aplicar em banco com dados existentes:
--   SELECT etapa_escolar, nivel_estrutural, LOWER(TRIM(enunciado)) AS norm, COUNT(*) AS qtd
--   FROM perguntas
--   GROUP BY etapa_escolar, nivel_estrutural, norm
--   HAVING qtd > 1;
-- ============================================================================

-- 1. Usuários (Identidade, RBAC e Consentimento de Pesquisa)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    google_sub VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    apelido_padrao VARCHAR(16) NULL,
    avatar_padrao VARCHAR(32) NOT NULL DEFAULT 'coelho',
    foto_url VARCHAR(500) NULL,
    papel_sistema ENUM('jogador', 'professor', 'admin') NOT NULL DEFAULT 'jogador',
    consentimento_pesquisa TINYINT(1) NOT NULL DEFAULT 0,
    consentimento_em DATETIME NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_login_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_uuid (uuid),
    UNIQUE KEY uq_usuarios_google_sub (google_sub),
    UNIQUE KEY uq_usuarios_email (email),
    INDEX idx_usuarios_papel_ativo (papel_sistema, ativo)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Turmas / Sessões Pedagógicas (gerenciadas por Professores)
CREATE TABLE IF NOT EXISTS turmas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    professor_id INT UNSIGNED NOT NULL,
    codigo VARCHAR(16) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    instituicao VARCHAR(120) NULL DEFAULT 'UFRRJ',
    etapa_padrao ENUM('Fundamental', 'Médio', 'Superior') NOT NULL,
    ativa TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_turmas_codigo (codigo),
    INDEX idx_turmas_professor_ativa (professor_id, ativa),
    CONSTRAINT fk_turmas_professor
        FOREIGN KEY (professor_id) REFERENCES usuarios (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 3. Matrizes de Equidade Versionadas (calibração científica / experimentos A/B)
CREATE TABLE IF NOT EXISTS matrizes_equidade (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(32) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    descricao TEXT NULL,
    configuracao_json JSON NOT NULL,
    ativa TINYINT(1) NOT NULL DEFAULT 0,
    criado_por INT UNSIGNED NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_matrizes_codigo (codigo),
    INDEX idx_matrizes_ativa (ativa),
    CONSTRAINT fk_matrizes_criado_por
        FOREIGN KEY (criado_por) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO matrizes_equidade (codigo, nome, descricao, configuracao_json, ativa)
VALUES (
    'v1.0-baseline',
    'Matriz de Equidade Baseline v1.0',
    'Rascunho inicial de quatro barreiras ambientais (casas 7, 14, 21, 28) cruzadas com quatro perspectivas de jogo para validação pedagógica e estatística.',
    JSON_OBJECT(
        '7', JSON_OBJECT(
            'name', 'escada',
            'levels', JSON_OBJECT('cadeirante', 3, 'surdo', 1, 'cego', 2, 'neuroatipico', 1)
        ),
        '14', JSON_OBJECT(
            'name', 'alerta_sonoro',
            'levels', JSON_OBJECT('cadeirante', 1, 'surdo', 3, 'cego', 1, 'neuroatipico', 2)
        ),
        '21', JSON_OBJECT(
            'name', 'multidao_barulho',
            'levels', JSON_OBJECT('cadeirante', 1, 'surdo', 1, 'cego', 2, 'neuroatipico', 3)
        ),
        '28', JSON_OBJECT(
            'name', 'placa_ilegivel',
            'levels', JSON_OBJECT('cadeirante', 1, 'surdo', 1, 'cego', 3, 'neuroatipico', 1)
        )
    ),
    1
);

-- 4. Evolução retrocompatível da tabela `perguntas`
--    Adiciona deduplicação determinística, taxonomia curricular, fluxo editorial e auditoria.
ALTER TABLE perguntas
    ADD COLUMN enunciado_hash CHAR(64) GENERATED ALWAYS AS (
        SHA2(
            CONCAT_WS(
                '|',
                CAST(etapa_escolar AS CHAR CHARACTER SET utf8mb4),
                CAST(nivel_estrutural AS CHAR CHARACTER SET utf8mb4),
                LOWER(TRIM(enunciado))
            ),
            256
        )
    ) STORED AFTER tags,
    ADD COLUMN area_tematica VARCHAR(80) NULL AFTER enunciado_hash,
    ADD COLUMN codigo_bncc VARCHAR(32) NULL AFTER area_tematica,
    ADD COLUMN status_revisao ENUM('rascunho', 'em_revisao', 'aprovada', 'arquivada') NOT NULL DEFAULT 'aprovada' AFTER codigo_bncc,
    ADD COLUMN ativa TINYINT(1) NOT NULL DEFAULT 1 AFTER status_revisao,
    ADD COLUMN criado_por INT UNSIGNED NULL AFTER ativa,
    ADD COLUMN revisado_por INT UNSIGNED NULL AFTER criado_por,
    ADD COLUMN revisado_em DATETIME NULL AFTER revisado_por,
    ADD COLUMN criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER revisado_em,
    ADD COLUMN atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em,
    ADD UNIQUE INDEX uq_perguntas_enunciado_hash (enunciado_hash),
    ADD INDEX idx_perguntas_selecao (etapa_escolar, nivel_estrutural, ativa, status_revisao),
    ADD INDEX idx_perguntas_area (area_tematica),
    ADD CONSTRAINT fk_perguntas_criado_por
        FOREIGN KEY (criado_por) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_perguntas_revisado_por
        FOREIGN KEY (revisado_por) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Partidas concluídas (persistidas de forma transacional ao final da partida)
CREATE TABLE IF NOT EXISTS partidas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    room_code CHAR(4) NOT NULL,
    turma_id INT UNSIGNED NULL,
    matriz_id INT UNSIGNED NULL,
    anfitriao_usuario_id INT UNSIGNED NULL,
    etapa_escolar ENUM('Fundamental', 'Médio', 'Superior') NOT NULL,
    modo_privado TINYINT(1) NOT NULL DEFAULT 0,
    quiz_duracao_seg SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    max_rodadas TINYINT UNSIGNED NOT NULL DEFAULT 8,
    total_jogadores TINYINT UNSIGNED NOT NULL,
    rodadas_jogadas TINYINT UNSIGNED NOT NULL,
    total_turnos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    total_obstaculos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    total_impulsos SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    motivo_fim ENUM('finish', 'round_limit', 'abandoned') NOT NULL,
    elegivel_pesquisa TINYINT(1) NOT NULL DEFAULT 0,
    iniciada_em DATETIME NOT NULL,
    finalizada_em DATETIME NOT NULL,
    duracao_seg INT UNSIGNED NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_partidas_uuid (uuid),
    CONSTRAINT chk_partidas_total_jogadores CHECK (total_jogadores BETWEEN 4 AND 8),
    CONSTRAINT chk_partidas_quiz_duracao CHECK (quiz_duracao_seg BETWEEN 15 AND 120),
    INDEX idx_partidas_etapa_fim (etapa_escolar, finalizada_em),
    INDEX idx_partidas_turma_fim (turma_id, finalizada_em),
    INDEX idx_partidas_matriz_etapa (matriz_id, etapa_escolar),
    CONSTRAINT fk_partidas_turma
        FOREIGN KEY (turma_id) REFERENCES turmas (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_partidas_matriz
        FOREIGN KEY (matriz_id) REFERENCES matrizes_equidade (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_partidas_anfitriao
        FOREIGN KEY (anfitriao_usuario_id) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 6. Participantes por Partida (unidade amostral para inferência e histórico pessoal)
CREATE TABLE IF NOT EXISTS partida_participantes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    partida_id BIGINT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NULL,
    participante_anon_id CHAR(36) NOT NULL,
    apelido_partida VARCHAR(16) NOT NULL,
    avatar_id VARCHAR(32) NOT NULL,
    condicao ENUM('cadeirante', 'cego', 'surdo', 'neuroatipico') NOT NULL,
    ordem_turno TINYINT UNSIGNED NOT NULL,
    posicao_final TINYINT UNSIGNED NOT NULL,
    pontos_quiz SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    vencedor TINYINT(1) NOT NULL DEFAULT 0,
    destaque_quiz TINYINT(1) NOT NULL DEFAULT 0,
    rolagens_dado SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    soma_dados SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    media_dado DECIMAL(4,2) NULL,
    impulsos_ativados TINYINT UNSIGNED NOT NULL DEFAULT 0,
    obstaculos_ativados TINYINT UNSIGNED NOT NULL DEFAULT 0,
    quizzes_respondidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    quizzes_corretos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    nivel1_enfrentados TINYINT UNSIGNED NOT NULL DEFAULT 0,
    nivel2_enfrentados TINYINT UNSIGNED NOT NULL DEFAULT 0,
    nivel3_enfrentados TINYINT UNSIGNED NOT NULL DEFAULT 0,
    desconectou TINYINT(1) NOT NULL DEFAULT 0,
    consentiu_pesquisa TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_partida_participante_anon (partida_id, participante_anon_id),
    CONSTRAINT chk_pp_ordem_turno CHECK (ordem_turno BETWEEN 1 AND 8),
    CONSTRAINT chk_pp_posicao_final CHECK (posicao_final BETWEEN 0 AND 30),
    INDEX idx_pp_usuario_partida (usuario_id, partida_id),
    INDEX idx_pp_condicao_vencedor (condicao, vencedor),
    INDEX idx_pp_consentimento (consentiu_pesquisa, condicao),
    CONSTRAINT fk_pp_partida
        FOREIGN KEY (partida_id) REFERENCES partidas (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pp_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 7. Eventos de Turno (trajetória estocástica / análise de Cadeias de Markov)
CREATE TABLE IF NOT EXISTS partida_turnos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    partida_id BIGINT UNSIGNED NOT NULL,
    participante_id BIGINT UNSIGNED NOT NULL,
    numero_turno SMALLINT UNSIGNED NOT NULL,
    rodada TINYINT UNSIGNED NOT NULL,
    valor_dado TINYINT UNSIGNED NOT NULL,
    posicao_anterior TINYINT UNSIGNED NOT NULL,
    posicao_pouso TINYINT UNSIGNED NOT NULL,
    posicao_final TINYINT UNSIGNED NOT NULL,
    ativou_impulso TINYINT(1) NOT NULL DEFAULT 0,
    ativou_obstaculo TINYINT(1) NOT NULL DEFAULT 0,
    obstaculo_nome VARCHAR(32) NULL,
    ocorrido_em DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_partida_turno (partida_id, numero_turno),
    CONSTRAINT chk_pt_valor_dado CHECK (valor_dado BETWEEN 1 AND 6),
    CONSTRAINT chk_pt_posicoes CHECK (
        posicao_anterior BETWEEN 0 AND 30
        AND posicao_pouso BETWEEN 0 AND 30
        AND posicao_final BETWEEN 0 AND 30
    ),
    INDEX idx_pt_participante (participante_id),
    INDEX idx_pt_obstaculo (ativou_obstaculo, obstaculo_nome),
    CONSTRAINT fk_pt_partida
        FOREIGN KEY (partida_id) REFERENCES partidas (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pt_participante
        FOREIGN KEY (participante_id) REFERENCES partida_participantes (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 8. Rodadas Coletivas de Quiz
CREATE TABLE IF NOT EXISTS quiz_rodadas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    partida_id BIGINT UNSIGNED NOT NULL,
    turno_id BIGINT UNSIGNED NULL,
    quiz_uuid CHAR(36) NOT NULL,
    rodada_partida TINYINT UNSIGNED NOT NULL,
    posicao_obstaculo TINYINT UNSIGNED NOT NULL,
    obstaculo_nome VARCHAR(32) NOT NULL,
    participantes_n TINYINT UNSIGNED NOT NULL,
    motivo_fim ENUM('all_answered', 'timeout', 'questions_unavailable', 'quiz_unavailable') NOT NULL,
    iniciada_em DATETIME NOT NULL,
    finalizada_em DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_quiz_rodadas_uuid (quiz_uuid),
    INDEX idx_qr_partida (partida_id),
    INDEX idx_qr_obstaculo (obstaculo_nome),
    CONSTRAINT fk_qr_partida
        FOREIGN KEY (partida_id) REFERENCES partidas (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_qr_turno
        FOREIGN KEY (turno_id) REFERENCES partida_turnos (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 9. Respostas Individuais do Quiz (dados granulares para TCT, TRI e Inferência)
CREATE TABLE IF NOT EXISTS quiz_respostas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    quiz_rodada_id BIGINT UNSIGNED NOT NULL,
    participante_id BIGINT UNSIGNED NOT NULL,
    pergunta_id INT UNSIGNED NOT NULL,
    condicao ENUM('cadeirante', 'cego', 'surdo', 'neuroatipico') NOT NULL,
    nivel_estrutural TINYINT UNSIGNED NOT NULL,
    alternativa_marcada ENUM('A', 'B', 'C', 'D') NULL,
    correta TINYINT(1) NOT NULL DEFAULT 0,
    tempo_resposta_ms INT UNSIGNED NULL,
    ordem_recebimento TINYINT UNSIGNED NULL,
    pontos_obtidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    avanco_bonus_casas TINYINT UNSIGNED NOT NULL DEFAULT 0,
    desconectado TINYINT(1) NOT NULL DEFAULT 0,
    respondido_em DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_quiz_resposta_participante (quiz_rodada_id, participante_id),
    CONSTRAINT chk_qres_nivel CHECK (nivel_estrutural IN (1, 2, 3)),
    INDEX idx_qres_pergunta_correta (pergunta_id, correta),
    INDEX idx_qres_nivel_condicao (nivel_estrutural, condicao, correta),
    INDEX idx_qres_participante (participante_id),
    CONSTRAINT fk_qres_rodada
        FOREIGN KEY (quiz_rodada_id) REFERENCES quiz_rodadas (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_qres_participante
        FOREIGN KEY (participante_id) REFERENCES partida_participantes (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_qres_pergunta
        FOREIGN KEY (pergunta_id) REFERENCES perguntas (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES (
    '002_usuarios_turmas_partidas_analytics',
    'Tabelas usuarios, turmas, matrizes_equidade, evolucao de perguntas e telemetria analitica de partidas/turnos/quizzes'
);
