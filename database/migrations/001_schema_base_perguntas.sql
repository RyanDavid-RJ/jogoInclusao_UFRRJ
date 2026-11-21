-- ============================================================================
-- Migration 001: Controle de migrações e tabela base `perguntas`
-- Alvo: MySQL 8.0 / 8.4 (utf8mb4_unicode_ci)
-- Seguro para bancos novos e bancos existentes (`CREATE TABLE IF NOT EXISTS`).
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (version)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS perguntas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    etapa_escolar ENUM('Fundamental', 'Médio', 'Superior') NOT NULL,
    nivel_estrutural TINYINT UNSIGNED NOT NULL,
    enunciado TEXT NOT NULL,
    opcao_a VARCHAR(500) NOT NULL,
    opcao_b VARCHAR(500) NOT NULL,
    opcao_c VARCHAR(500) NOT NULL,
    opcao_d VARCHAR(500) NOT NULL,
    resposta_correta ENUM('A', 'B', 'C', 'D') NOT NULL,
    explicacao TEXT NULL,
    tags JSON NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_perguntas_nivel CHECK (nivel_estrutural IN (1, 2, 3)),
    INDEX idx_perguntas_etapa_nivel (etapa_escolar, nivel_estrutural)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES (
    '001_schema_base_perguntas',
    'Tabela de controle schema_migrations e tabela base perguntas'
);
