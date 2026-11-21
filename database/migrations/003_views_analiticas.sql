-- ============================================================================
-- Migration 003: Views Analíticas e Datasets Anonimizados (ICE — UFRRJ)
-- Alvo: MySQL 8.0 / 8.4
-- Pré-requisito: Migration 002 aplicada.
-- Seguro para reexecução (`CREATE OR REPLACE VIEW`).
-- ============================================================================

-- 1. Diagnóstico empírico de questões (TCT: facilidade, omissão, latência e distratores)
CREATE OR REPLACE VIEW vw_desempenho_perguntas AS
SELECT
    p.id AS pergunta_id,
    p.etapa_escolar,
    p.nivel_estrutural,
    p.area_tematica,
    p.status_revisao,
    p.ativa,
    p.enunciado,
    COUNT(qr.id) AS total_aplicacoes,
    SUM(CASE WHEN qr.alternativa_marcada IS NOT NULL THEN 1 ELSE 0 END) AS total_respondidas,
    SUM(CASE WHEN qr.correta = 1 THEN 1 ELSE 0 END) AS total_acertos,
    ROUND(AVG(CASE WHEN qr.alternativa_marcada IS NOT NULL THEN qr.correta END), 4) AS taxa_acerto_respondidas,
    ROUND(AVG(qr.correta), 4) AS indice_facilidade_global,
    ROUND(AVG(CASE WHEN qr.alternativa_marcada IS NULL THEN 1 ELSE 0 END), 4) AS taxa_sem_resposta,
    ROUND(AVG(qr.tempo_resposta_ms), 1) AS tempo_medio_ms,
    SUM(CASE WHEN qr.alternativa_marcada = 'A' THEN 1 ELSE 0 END) AS escolhas_a,
    SUM(CASE WHEN qr.alternativa_marcada = 'B' THEN 1 ELSE 0 END) AS escolhas_b,
    SUM(CASE WHEN qr.alternativa_marcada = 'C' THEN 1 ELSE 0 END) AS escolhas_c,
    SUM(CASE WHEN qr.alternativa_marcada = 'D' THEN 1 ELSE 0 END) AS escolhas_d
FROM perguntas AS p
LEFT JOIN quiz_respostas AS qr
    ON qr.pergunta_id = p.id
GROUP BY
    p.id,
    p.etapa_escolar,
    p.nivel_estrutural,
    p.area_tematica,
    p.status_revisao,
    p.ativa,
    p.enunciado;

-- 2. Indicadores de Equidade agregados por Etapa, Matriz e Condição
CREATE OR REPLACE VIEW vw_equidade_por_condicao AS
SELECT
    pa.etapa_escolar,
    COALESCE(m.codigo, 'sem_matriz') AS matriz_codigo,
    pp.condicao,
    COUNT(pp.id) AS total_participacoes,
    SUM(pp.vencedor) AS total_vitorias,
    ROUND(AVG(pp.vencedor), 4) AS taxa_vitoria,
    ROUND(AVG(pp.posicao_final), 2) AS posicao_media,
    ROUND(AVG(pp.media_dado), 2) AS media_dado_geral,
    ROUND(AVG(pp.pontos_quiz), 2) AS media_pontos_quiz,
    ROUND(
        SUM(pp.quizzes_corretos) / NULLIF(SUM(pp.quizzes_respondidos), 0),
        4
    ) AS taxa_acerto_quiz,
    SUM(pp.nivel1_enfrentados) AS total_nivel1,
    SUM(pp.nivel2_enfrentados) AS total_nivel2,
    SUM(pp.nivel3_enfrentados) AS total_nivel3
FROM partida_participantes AS pp
INNER JOIN partidas AS pa
    ON pa.id = pp.partida_id
LEFT JOIN matrizes_equidade AS m
    ON m.id = pa.matriz_id
WHERE pa.motivo_fim <> 'abandoned'
GROUP BY
    pa.etapa_escolar,
    COALESCE(m.codigo, 'sem_matriz'),
    pp.condicao;

-- 3. Validação Empírica da Matriz de Equidade (Obstáculo × Condição × Nível)
CREATE OR REPLACE VIEW vw_matriz_empirica AS
SELECT
    pa.etapa_escolar,
    COALESCE(m.codigo, 'sem_matriz') AS matriz_codigo,
    qrod.obstaculo_nome,
    qres.condicao,
    qres.nivel_estrutural,
    COUNT(qres.id) AS total_observacoes,
    SUM(CASE WHEN qres.alternativa_marcada IS NOT NULL THEN 1 ELSE 0 END) AS total_respondidas,
    SUM(qres.correta) AS total_acertos,
    ROUND(AVG(qres.correta), 4) AS taxa_acerto_global,
    ROUND(AVG(CASE WHEN qres.alternativa_marcada IS NOT NULL THEN qres.correta END), 4) AS taxa_acerto_respondidas,
    ROUND(AVG(CASE WHEN qres.alternativa_marcada IS NULL THEN 1 ELSE 0 END), 4) AS taxa_timeout_ou_saida,
    ROUND(AVG(qres.tempo_resposta_ms), 1) AS tempo_medio_ms,
    ROUND(AVG(qres.pontos_obtidos), 2) AS media_pontos
FROM quiz_respostas AS qres
INNER JOIN quiz_rodadas AS qrod
    ON qrod.id = qres.quiz_rodada_id
INNER JOIN partidas AS pa
    ON pa.id = qrod.partida_id
LEFT JOIN matrizes_equidade AS m
    ON m.id = pa.matriz_id
GROUP BY
    pa.etapa_escolar,
    COALESCE(m.codigo, 'sem_matriz'),
    qrod.obstaculo_nome,
    qres.condicao,
    qres.nivel_estrutural;

-- 4. Dataset Tabular Anonimizado de Participações (pronto para R / Python / Inferência)
--    Zero PII: omite nomes civis, e-mails, google_sub e apelidos; filtra consentiu_pesquisa = 1.
CREATE OR REPLACE VIEW vw_dataset_anonimo_participacoes AS
SELECT
    pa.uuid AS partida_uuid,
    pa.etapa_escolar,
    COALESCE(m.codigo, 'sem_matriz') AS matriz_codigo,
    t.codigo AS turma_codigo,
    pa.total_jogadores,
    pa.max_rodadas,
    pa.rodadas_jogadas,
    pa.quiz_duracao_seg,
    pa.duracao_seg,
    pa.motivo_fim,
    pp.participante_anon_id,
    pp.condicao,
    pp.ordem_turno,
    pp.posicao_final,
    pp.pontos_quiz,
    pp.vencedor,
    pp.destaque_quiz,
    pp.rolagens_dado,
    pp.soma_dados,
    pp.media_dado,
    pp.impulsos_ativados,
    pp.obstaculos_ativados,
    pp.quizzes_respondidos,
    pp.quizzes_corretos,
    pp.nivel1_enfrentados,
    pp.nivel2_enfrentados,
    pp.nivel3_enfrentados,
    pp.desconectou,
    pa.finalizada_em
FROM partida_participantes AS pp
INNER JOIN partidas AS pa
    ON pa.id = pp.partida_id
LEFT JOIN matrizes_equidade AS m
    ON m.id = pa.matriz_id
LEFT JOIN turmas AS t
    ON t.id = pa.turma_id
WHERE pp.consentiu_pesquisa = 1
  AND pa.motivo_fim <> 'abandoned';

-- 5. Dataset Tabular Anonimizado de Respostas de Quiz (pronto para TRI / análise de latência)
--    Zero PII: filtra consentiu_pesquisa = 1.
CREATE OR REPLACE VIEW vw_dataset_anonimo_respostas AS
SELECT
    pa.uuid AS partida_uuid,
    qrod.quiz_uuid,
    pa.etapa_escolar,
    COALESCE(m.codigo, 'sem_matriz') AS matriz_codigo,
    t.codigo AS turma_codigo,
    qrod.rodada_partida,
    qrod.posicao_obstaculo,
    qrod.obstaculo_nome,
    qrod.participantes_n,
    qrod.motivo_fim AS motivo_fim_quiz,
    pp.participante_anon_id,
    qres.pergunta_id,
    p.area_tematica,
    qres.condicao,
    qres.nivel_estrutural,
    qres.alternativa_marcada,
    qres.correta,
    qres.tempo_resposta_ms,
    qres.ordem_recebimento,
    qres.pontos_obtidos,
    qres.avanco_bonus_casas,
    qres.desconectado,
    qrod.iniciada_em
FROM quiz_respostas AS qres
INNER JOIN quiz_rodadas AS qrod
    ON qrod.id = qres.quiz_rodada_id
INNER JOIN partida_participantes AS pp
    ON pp.id = qres.participante_id
INNER JOIN partidas AS pa
    ON pa.id = qrod.partida_id
INNER JOIN perguntas AS p
    ON p.id = qres.pergunta_id
LEFT JOIN matrizes_equidade AS m
    ON m.id = pa.matriz_id
LEFT JOIN turmas AS t
    ON t.id = pa.turma_id
WHERE pp.consentiu_pesquisa = 1;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES (
    '003_views_analiticas',
    'Views analiticas vw_desempenho_perguntas, vw_equidade_por_condicao, vw_matriz_empirica e datasets anonimizados'
);
