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

INSERT INTO perguntas
    (etapa_escolar, nivel_estrutural, enunciado,
     opcao_a, opcao_b, opcao_c, opcao_d,
     resposta_correta, explicacao, tags)
SELECT seeds.etapa_escolar, seeds.nivel_estrutural, seeds.enunciado,
       seeds.opcao_a, seeds.opcao_b, seeds.opcao_c, seeds.opcao_d,
       seeds.resposta_correta, seeds.explicacao, seeds.tags
FROM (
    SELECT
        'Fundamental' AS etapa_escolar, 1 AS nivel_estrutural,
        'Uma caixa tem 48 lápis. Se eles forem repartidos igualmente entre 6 alunos, quantos lápis cada aluno receberá?' AS enunciado,
        '6' AS opcao_a, '8' AS opcao_b, '7' AS opcao_c, '9' AS opcao_d,
        'B' AS resposta_correta, '48 dividido por 6 é igual a 8.' AS explicacao,
        JSON_ARRAY('divisao', 'operacoes_basicas') AS tags
    UNION ALL
    SELECT
        'Fundamental', 2,
        'Uma escola arrecadou 84 livros. Separou 18 para a biblioteca e dividiu o restante igualmente entre 3 turmas. Quantos livros cada turma recebeu?',
        '20', '22', '24', '26',
        'B', 'Primeiro: 84 - 18 = 66. Depois: 66 dividido por 3 = 22.',
        JSON_ARRAY('subtracao', 'divisao', 'problema_em_etapas')
    UNION ALL
    SELECT
        'Fundamental', 3,
        'O triplo de um número, menos 5, é igual a 28. Qual é esse número?',
        '9', '10', '11', '12',
        'C', 'Se 3x - 5 = 28, então 3x = 33 e x = 11.',
        JSON_ARRAY('equacao', 'multiplicacao', 'fundamental')
    UNION ALL
    SELECT
        'Médio', 1,
        'Uma camiseta custa R$ 80,00 e está com desconto de 25%. Qual é o valor do desconto?',
        'R$ 15,00', 'R$ 20,00', 'R$ 25,00', 'R$ 60,00',
        'B', '25% de 80 é 0,25 × 80 = 20. O desconto é de R$ 20,00.',
        JSON_ARRAY('porcentagem', 'calculo_direto')
    UNION ALL
    SELECT
        'Médio', 2,
        'Uma turma tem 30 estudantes. 40% participam de um clube de ciências e, entre esses participantes, um terço também participa do clube de leitura. Quantos estudantes participam dos dois clubes?',
        '3', '4', '8', '12',
        'B', '40% de 30 são 12 estudantes. Um terço de 12 é 4.',
        JSON_ARRAY('porcentagem', 'fracao', 'problema_em_etapas')
    UNION ALL
    SELECT
        'Médio', 3,
        'A soma de dois números é 26 e a diferença entre eles é 8. Qual é o maior número?',
        '9', '13', '17', '18',
        'C', 'Se x + y = 26 e x - y = 8, somando as equações obtemos 2x = 34; logo, x = 17.',
        JSON_ARRAY('sistema_linear', 'equacoes')
    UNION ALL
    SELECT
        'Superior', 1,
        'Em uma amostra com valores 4, 6, 8 e 10, qual é a média aritmética?',
        '6', '7', '8', '28',
        'B', 'A média é (4 + 6 + 8 + 10) dividido por 4, isto é, 28 ÷ 4 = 7.',
        JSON_ARRAY('estatistica', 'media_aritmetica')
    UNION ALL
    SELECT
        'Superior', 2,
        'Um projeto tem custo inicial de R$ 1.000,00. Ao final do primeiro ano, recebe R$ 600,00 e, ao final do segundo, mais R$ 600,00. Desconsiderando juros, qual é o saldo acumulado após os dois recebimentos?',
        'R$ 0,00', 'R$ 200,00', 'R$ 600,00', 'R$ 1.200,00',
        'B', 'O saldo é -1.000 + 600 + 600 = R$ 200,00.',
        JSON_ARRAY('fluxo_de_caixa', 'calculo_em_etapas')
    UNION ALL
    SELECT
        'Superior', 3,
        'Uma pesquisa estima uma proporção populacional de 0,50 com margem de erro de 0,04 em um intervalo de confiança. Qual é o intervalo estimado?',
        '0,46 a 0,54', '0,40 a 0,50', '0,50 a 0,54', '0,04 a 0,50',
        'A', 'Subtraindo e somando a margem de erro à estimativa: 0,50 - 0,04 = 0,46 e 0,50 + 0,04 = 0,54.',
        JSON_ARRAY('estatistica', 'intervalo_de_confianca')
) AS seeds
WHERE NOT EXISTS (
    SELECT 1
    FROM perguntas AS existing
    WHERE existing.etapa_escolar = seeds.etapa_escolar
      AND existing.nivel_estrutural = seeds.nivel_estrutural
      AND existing.enunciado = seeds.enunciado
);
