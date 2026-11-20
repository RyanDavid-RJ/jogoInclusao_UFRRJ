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
        'Uma biblioteca recebeu 36 livros e quer organizar a mesma quantidade em 4 prateleiras. Quantos livros ficarão em cada prateleira?' AS enunciado,
        '7' AS opcao_a, '8' AS opcao_b, '9' AS opcao_c, '10' AS opcao_d,
        'C' AS resposta_correta, '36 dividido por 4 é igual a 9.' AS explicacao,
        JSON_ARRAY('divisao', 'organizacao') AS tags
    UNION ALL
    SELECT
        'Fundamental', 1,
        'Uma receita usa 3 ovos para fazer 12 biscoitos. Mantendo a proporção, quantos ovos são necessários para fazer 24 biscoitos?',
        '3', '4', '6', '8',
        'C', '24 biscoitos correspondem ao dobro de 12, então são necessários 2 vezes 3, ou 6 ovos.',
        JSON_ARRAY('proporcao', 'multiplicacao')
    UNION ALL
    SELECT
        'Fundamental', 2,
        'Uma escola tem 5 caixas com 18 lápis em cada uma. Depois, distribui 27 lápis. Quantos lápis sobram?',
        '53', '63', '73', '117',
        'B', 'Primeiro, 5 vezes 18 = 90. Depois, 90 - 27 = 63.',
        JSON_ARRAY('multiplicacao', 'subtracao', 'problema_em_etapas')
    UNION ALL
    SELECT
        'Fundamental', 2,
        'Um retângulo tem 8 cm de comprimento e 5 cm de largura. Qual é seu perímetro?',
        '13 cm', '26 cm', '40 cm', '80 cm',
        'B', 'O perímetro é 2 vezes (8 + 5), portanto mede 26 cm.',
        JSON_ARRAY('geometria', 'perimetro')
    UNION ALL
    SELECT
        'Fundamental', 3,
        'Uma sequência começa em 4 e aumenta 7 a cada termo: 4, 11, 18, 25. Qual é o próximo termo?',
        '30', '31', '32', '33',
        'C', 'A diferença entre termos é 7; logo, 25 + 7 = 32.',
        JSON_ARRAY('sequencias', 'raciocinio')
    UNION ALL
    SELECT
        'Fundamental', 3,
        'Em uma turma, 2/5 dos 30 estudantes escolheram um livro de aventuras. Quantos estudantes fizeram essa escolha?',
        '6', '10', '12', '15',
        'C', '30 dividido por 5 é 6, e 6 vezes 2 é 12.',
        JSON_ARRAY('fracoes', 'interpretacao')
    UNION ALL
    SELECT
        'Médio', 1,
        'Qual é o valor de x na equação 2x + 7 = 19?',
        '5', '6', '7', '13',
        'B', 'Subtraindo 7 dos dois lados, obtemos 2x = 12; portanto, x = 6.',
        JSON_ARRAY('equacao', 'algebra')
    UNION ALL
    SELECT
        'Médio', 1,
        'Um ciclista percorre 45 km em 3 horas, mantendo velocidade constante. Qual é sua velocidade média?',
        '12 km/h', '15 km/h', '18 km/h', '135 km/h',
        'B', 'A velocidade média é distância dividida pelo tempo: 45 dividido por 3 = 15 km/h.',
        JSON_ARRAY('velocidade_media', 'grandezas')
    UNION ALL
    SELECT
        'Médio', 2,
        'Uma população de bactérias dobra a cada hora. Se começa com 500 bactérias, quantas haverá após 3 horas?',
        '1.000', '2.000', '4.000', '8.000',
        'C', 'Após três duplicações, 500 vezes 2 ao cubo = 500 vezes 8 = 4.000.',
        JSON_ARRAY('exponenciacao', 'crescimento')
    UNION ALL
    SELECT
        'Médio', 2,
        'Um produto de R$ 200,00 sofre aumento de 10% e depois desconto de 10% sobre o novo preço. Qual é o preço final?',
        'R$ 198,00', 'R$ 200,00', 'R$ 202,00', 'R$ 220,00',
        'A', 'O aumento leva o preço a R$ 220,00. O desconto é R$ 22,00, resultando em R$ 198,00.',
        JSON_ARRAY('porcentagem', 'variacao_sucessiva')
    UNION ALL
    SELECT
        'Médio', 3,
        'Em um triângulo retângulo, os catetos medem 6 cm e 8 cm. Quanto mede a hipotenusa?',
        '9 cm', '10 cm', '12 cm', '14 cm',
        'B', 'Pelo teorema de Pitágoras, a hipotenusa é raiz de (6 ao quadrado + 8 ao quadrado) = raiz de 100 = 10 cm.',
        JSON_ARRAY('geometria', 'pitagoras')
    UNION ALL
    SELECT
        'Médio', 3,
        'As notas de uma estudante foram 6, 7, 8 e 9. Qual nota ela precisa tirar na quinta avaliação para obter média 8?',
        '8', '9', '10', '11',
        'C', 'Para média 8, a soma deve ser 40. As quatro notas somam 30, então faltam 10 pontos.',
        JSON_ARRAY('media', 'equacao')
    UNION ALL
    SELECT
        'Superior', 1,
        'Qual é a derivada de f(x) = 3x² - 4x + 1?',
        '3x - 4', '6x - 4', '6x + 1', '3x² - 4',
        'B', 'Aplicando a regra da potência, a derivada é 6x - 4.',
        JSON_ARRAY('calculo', 'derivada')
    UNION ALL
    SELECT
        'Superior', 1,
        'Em uma tabela de dados, a mediana é o valor que ocupa qual posição conceitual após ordenar as observações?',
        'A primeira posição', 'A posição central', 'A posição mais frequente', 'A última posição',
        'B', 'A mediana é o valor central; com quantidade par, calcula-se a média dos dois valores centrais.',
        JSON_ARRAY('estatistica', 'mediana')
    UNION ALL
    SELECT
        'Superior', 2,
        'Uma matriz 2 por 2 tem primeira linha (2, 1) e segunda linha (3, 4). Qual é seu determinante?',
        '5', '8', '11', '14',
        'A', 'O determinante é 2 vezes 4 menos 1 vezes 3, isto é, 8 - 3 = 5.',
        JSON_ARRAY('algebra_linear', 'matrizes')
    UNION ALL
    SELECT
        'Superior', 2,
        'Uma urna contém 3 bolas vermelhas e 2 azuis. Retirando uma bola ao acaso, qual é a probabilidade de ela ser azul?',
        '1/5', '2/5', '3/5', '2/3',
        'B', 'Há 2 resultados azuis em um total de 5 bolas, portanto a probabilidade é 2/5.',
        JSON_ARRAY('probabilidade', 'combinatoria')
    UNION ALL
    SELECT
        'Superior', 3,
        'Em um teste estatístico, o p-valor obtido foi 0,03 e o nível de significância adotado foi 0,05. Qual decisão é compatível com o teste?',
        'Aceitar sempre a hipótese nula', 'Rejeitar a hipótese nula', 'Aumentar o p-valor', 'Ignorar o nível de significância',
        'B', 'Como 0,03 é menor que 0,05, rejeita-se a hipótese nula sob esse critério.',
        JSON_ARRAY('estatistica', 'hipotese', 'p_valor')
    UNION ALL
    SELECT
        'Superior', 3,
        'Para uma função de custo C(q) = 100 + 5q + q², qual é o custo marginal em q = 10?',
        '15', '20', '25', '110',
        'C', 'O custo marginal é a derivada C''(q) = 5 + 2q. Em q = 10, vale 25.',
        JSON_ARRAY('calculo', 'economia', 'custo_marginal')
) AS seeds
WHERE NOT EXISTS (
    SELECT 1
    FROM perguntas AS existing
    WHERE existing.etapa_escolar = seeds.etapa_escolar
      AND existing.nivel_estrutural = seeds.nivel_estrutural
      AND existing.enunciado = seeds.enunciado
);
