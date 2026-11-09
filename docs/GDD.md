# GDD - JOGO DA INCLUSAO

# 🎲 GDD — Ludo Equidade (nome provisório)

## 1. Visão Geral

- **Gênero:** jogo de tabuleiro educativo, multiplayer online e assimétrico.
- **Participantes — regra aprovada e implementada:** mínimo de 4 e máximo de 8; a partida começa manualmente pelo anfitrião, sem início automático ao chegar a quatro. Se o anfitrião desconectar, a função passa ao próximo jogador da sala. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- **Plataforma-alvo:** mobile, com React Native e Expo Router.
- **Objetivo:** ensinar matemática e promover reflexão sobre equidade e inclusão por meio de obstáculos inspirados em barreiras do cotidiano.
- **Ciclo implementado no backend:** entrar em uma sala → escolher etapa escolar → iniciar manualmente → receber papel privado → jogar em turnos → rolar o dado e avançar → ao aterrissar em obstáculo, responder a um quiz simultâneo de 30 segundos → pontuar e avançar o turno ou encerrar a partida. O frontend já consome eventos de lobby e parte do estado de gameplay, mas ainda não implementa a interface do quiz nem o tabuleiro completo.
- **Tecnologias:** frontend React Native/Expo; backend Node.js, Express e Socket.IO; MySQL no Aiven (banco ativo confirmado como `defaultdb` para o protótipo).
- **Repositório:** [jogoInclusao_UFRRJ](https://github.com/RyanDavid-RJ/jogoInclusao_UFRRJ).
- **Origem:** ideia inspirada na SNCT da UFRRJ e em um trabalho sobre educação especial de uma turma de licenciatura. O desenvolvedor é estudante de Matemática Aplicada e Computacional na UFRRJ, com formação técnica em Eletrônica e Desenvolvimento de Sistemas (SENAI) e experiência como desenvolvedor aprendiz no Petrobras CENPES.

### Princípio de design

A condição sorteada representa uma perspectiva de jogo; não define a capacidade, inteligência ou dificuldade de aprendizagem de uma pessoa real. A matriz é uma abstração de barreiras ambientais para fins pedagógicos e deve ser validada com pessoas com deficiência, educadores e especialistas. O jogo deve oferecer acessibilidade para todos, sem transformar uma deficiência em estereótipo.

## 2. Papéis e Condições

- Papéis possíveis: cadeirante; pessoa com deficiência visual (cegueira/baixa visão); pessoa com deficiência auditiva (surdez); pessoa neuroatípica.
- **Distribuição aprovada:** em cada partida, sortear os quatro papéis de modo que cada um apareça ao menos uma vez; participantes adicionais (até o máximo de 8) recebem um dos quatro papéis sorteado com repetição. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- **Sigilo aprovado e envio privado implementado conforme relato:** cada pessoa recebe somente o próprio papel; o mapeamento jogador–papel não é transmitido à sala durante a partida. A revelação pública após anunciar o campeão ainda precisa ser implementada. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)

Os papéis cruzam-se com o obstáculo ativo para selecionar a intensidade do desafio matemático. As experiências são diversas; os rótulos da matriz são uma regra provisória do jogo, não uma descrição universal das pessoas representadas.

### Proposta de revelação e reflexão pós-jogo — a validar

- Durante a partida, cada pessoa vê o próprio nome e um avatar lúdico (animal/personagem), sabe o próprio papel e não vê os papéis dos demais. O avatar não indica deficiência.
- Depois de anunciar o campeão, revelar a correspondência jogador–papel e animar/apresentar cada avatar como uma figura humana ilustrativa do papel. Variar gênero, tom de pele, cabelo e outros traços com diversidade, sem sugerir que essa figura é a aparência real do jogador nem associar uma deficiência a uma raça ou gênero.
- A síntese pode separar fatores observados: sorte e movimento (dados, casas bônus/multiplicadores), exposição a obstáculos e níveis estruturais, desempenho matemático (acertos, ordem de resposta e pontos) e progresso no tabuleiro.
- Usar perguntas para estimular debate — por exemplo, se sorte, desafios enfrentados e desempenho matemático contribuíram de formas diferentes para o resultado — sem afirmar que os dados provam causalidade ou representam a experiência universal de uma deficiência.
- No MVP, manter os indicadores somente no estado temporário; não é necessário persistir histórico no banco. Validar linguagem, matriz, personagens e dinâmica com pessoas com deficiência e educadores. A peça de quebra-cabeça para neurodivergência/autismo é debatida por pessoas autistas; não fechar esse símbolo sem consulta comunitária. [[1]](https://pubmed.ncbi.nlm.nih.gov/28823194/)
- **Status:** Ryan confirmou que cada jogador sabe o próprio papel e que a associação dos demais será revelada após o campeão. Animação, personagens e relatório final são propostas de design a validar. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)

## 3. Regras do Jogo — Rascunho Jogável

1. **Sala — implementada:** a partida comporta de 4 a 8 jogadores e o anfitrião escolhe Fundamental, Médio ou Superior e inicia manualmente quando o grupo estiver pronto. Não há início automático ao chegar a quatro. Se o anfitrião desconectar, o próximo jogador assume. O servidor exige uma etapa válida para iniciar e bloqueia alterações depois do início.
2. **Sorteio e sigilo — implementados conforme relato:** os quatro papéis aparecem ao menos uma vez; participantes adicionais recebem papéis sorteados com repetição. Cada jogador recebe privadamente apenas seu próprio papel. A revelação final do mapa completo permanece pendente. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
3. **Ordem e movimento — implementados no backend:** a ordem é sorteada uma vez ao iniciar; o servidor rola um dado de 6 lados e move o peão no percurso compartilhado da posição 0 à 20. Aterrissar exatamente nas posições 4, 8, 12 ou 16 pausa a partida e inicia a preparação do quiz; passar por cima não ativa. Movimento excedente é limitado à posição 20.
4. **Quiz por obstáculo — implementado no backend:** ao pousar em obstáculo, o servidor deriva o nível pelo papel e pela matriz, busca uma pergunta para cada participante pela etapa da sala e só envia perguntas individuais depois que todas foram encontradas. Casas bônus/multiplicadores ficam fora do primeiro ciclo. O frontend ainda não trata os eventos do quiz.
5. **Quiz — integrado no backend:** todos os participantes conectados recebem uma pergunta individual; o servidor controla prazo comum de 30 segundos e aceita no máximo uma resposta por jogador. O gabarito e a explicação, quando disponível, são enviados apenas ao próprio jogador após a validação. Questões sem explicação são válidas; o resultado privado omite esse campo quando nulo.
6. **Pontuação — implementada no backend:** para N participantes fixados no início da rodada, acertos pontuam N, N−1, ... pela ordem de recebimento no servidor; erro, timeout ou desconexão vale zero, sem recalcular N. O cliente não escolhe o gabarito. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
7. **Fim e desempate — implementados no motor backend:** a partida termina imediatamente quando alguém chega à posição 20. Se ninguém chegar ao fim após 8 rodadas completas, vence quem estiver mais avançado; em empate de posição, vence quem tiver mais pontos de quiz; persistindo o empate, há campeões compartilhados. Os pontos do quiz são acumulados no estado e usados no desempate. Validar duração e ritmo em playtest.

## 4. Matriz de Equidade (rascunho para validação)

| Obstáculo da casa | Cadeirante | Surdo | Cego/baixa visão | Neuroatípico |
| --- | --- | --- | --- | --- |
| Escada (mobilidade) | Nível 3 | Nível 1 | Nível 2 | Nível 1 |
| Alerta sonoro (audição) | Nível 1 | Nível 3 | Nível 1 | Nível 2 |
| Multidão/barulho (sensorial) | Nível 1 | Nível 1 | Nível 2 | Nível 3 |
| Placa ilegível (visão) | Nível 1 | Nível 1 | Nível 3 | Nível 1 |
- **Nível 1:** desafio de menor complexidade estrutural; **Nível 2:** complexidade intermediária; **Nível 3:** maior complexidade estrutural. A dificuldade curricular deve respeitar a etapa escolar selecionada e não deve ser confundida com a condição da pessoa.
- **Como ler:** na casa da escada, por exemplo, o rascunho associa nível 3 ao papel cadeirante e nível 1 ao papel surdo. Na casa do alerta sonoro, a associação se inverte para esses dois papéis.
- **Intenção pedagógica:** tornar visível que uma mesma barreira pode ter impactos diferentes conforme o contexto, e que equidade pode exigir apoios diferentes.
- **Validação pendente:** revisar os obstáculos, os níveis e a linguagem com pessoas com deficiência e profissionais de educação especial antes de tratar a matriz como definitiva.

## 5. Quiz, Perguntas e Pontuação

- **Janela de resposta:** 30 segundos, com relógio controlado pelo servidor.
- **Níveis estruturais:** Nível 1 — operações básicas diretas; Nível 2 — problemas de lógica intermediários; Nível 3 — equações mais complexas.
- **Etapa escolar — implementada conforme relato:** Fundamental, Médio ou Superior é escolhida pelo anfitrião no lobby antes de iniciar a partida. É um filtro separado do nível estrutural; o servidor valida e guarda a escolha no estado da sala, propaga a seleção aos jogadores, exige valor válido para iniciar e bloqueia alterações após o início.
- **Ranking aprovado:** para N participantes, os acertos recebem N, N−1, ... até 1 ponto pela ordem de recebimento pelo servidor; erro e tempo esgotado valem zero.
- **Decisões ainda em aberto:** desempate; quantidade de perguntas por partida; política de reconexão durante o quiz.

## 6. Acessibilidade e Experiência

- Oferecer alternativas visuais e textuais para alertas sonoros; não depender apenas de cor para comunicar estado.
- Planejar suporte a leitor de tela, contraste ajustável, textos legíveis, controles simples e tempo configurável ou opções de acessibilidade.
- Evitar estímulos sonoros/visuais excessivos; permitir reduzir movimento e efeitos.
- Testar protótipos com pessoas com diferentes necessidades de acesso e ajustar a matriz com base no retorno.

## 7. Arquitetura e Estado do Projeto

**Stack planejada:** frontend React Native/Expo Router; backend Node.js/Express com Socket.IO; SQL hospedado no Aiven.

**Estado verificado em 2026-11-09:** lobby, motor de turnos, repositório de perguntas e quiz simultâneo foram implementados no backend. O quiz inicia somente em pouso exato nos obstáculos; mantém papéis e gabaritos no servidor, envia perguntas por socket individual, controla prazo, valida resposta única, calcula pontos, trata indisponibilidade sem rodada parcial e remove desconectados após a rodada. Questões com `explicacao: null` são aceitas e o campo é omitido do resultado privado. A suíte backend passou 52/52 testes; o Executor também reportou `npx tsc --noEmit` aprovado e lint sem erros, com um aviso em `frontend/src/app/index.tsx`. Os testes de integração Socket.IO usam doubles/mocks; ainda falta validar com clientes reais. A consulta Aiven em `defaultdb` e as nove combinações foram validadas conforme relatório do Executor. No frontend, a tela atual já trata criação/entrada de sala, início, estado do jogo, pausa de obstáculo e rolagem; ainda faltam interface do quiz, tabuleiro completo e validação multiplayer ponta a ponta. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)

## 8. Kanban Técnico

### To-Do

- [x]  **Baseline do percurso e vitória definido para implementação:** trilha linear de 20 casas; obstáculos nas posições 4, 8, 12 e 16; dado excedente para na chegada; primeira pessoa a chegar vence; limite de 8 rodadas completas, depois posição, pontos de quiz e, por fim, vitória compartilhada. Validar duração e ritmo em playtest; bônus e multiplicadores ficam adiados.
- [x]  **Inspeção arquitetural do motor:** relatório de Ryan/DeepSeek confirma que `backend/lobby.js` concentra o lobby, que a ordem atual é a de entrada e que ainda não há posições, turno, rodada ou vencedor; nenhuma alteração de código foi feita. A proposta é criar `backend/gameEngine.js` e preservar os eventos/payloads atuais do lobby. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- [x]  **Banco de perguntas no Aiven:** script aplicado em `defaultdb` após confirmar o banco conectado; estrutura validada; há questão para cada combinação de etapa e nível; consulta real do repositório confirmada, com gabarito e explicação fora da projeção pública. Validado conforme relatório do Executor em 2026-11-09.
- [ ]  **Acesso de produção ao Aiven:** antes da publicação, criar credencial de serviço própria com privilégios mínimos; nunca versionar credenciais nem dumps pessoais.
- [ ]  **Validar protocolo Socket.IO com clientes reais:** exercitar lobby, turnos, quiz, timeout, indisponibilidade e desconexões antes de ampliar a interface; os testes backend atuais usam doubles/mocks.
- [ ]  **Validação ponta a ponta:** exercitar lobby, gameplay e quiz com clientes Socket.IO reais, incluindo timeout, indisponibilidade, desconexões e fim de partida.
- [ ]  **Completar o frontend do jogo:** evoluir a tela já conectada parcialmente ao lobby e ao gameplay; mostrar tabuleiro/posições/turno, restringir a rolagem ao jogador ativo e tratar visualmente pausas e fim de jogo.
- [ ]  **Integrar quiz no frontend:** implementar pergunta privada, alternativas, timer sincronizado, envio de resposta, resultado e placar usando o protocolo validado; garantir acessibilidade.
- [ ]  **Revelação e reflexão pós-jogo:** revelar o mapa jogador–papel após o campeão; definir avatares e conteúdo educativo da tela final. O envio do papel individual durante o jogo foi implementado conforme relato.
- [ ]  **Configuração e qualidade:** retirar o endereço local fixo do frontend, adicionar testes para turnos/quiz e testar desconexão, reconexão e encerramento de salas.
- [ ]  **Acessibilidade:** prototipar leitor de tela, contraste, redução de movimento e opções de tempo; validar a matriz com público e especialistas.

### Doing

- Nenhuma tarefa em execução no momento.

### Done

- [x]  Monorepo inicial separado em `backend/` e `frontend/`.
- [x]  Frontend inicial configurado com React Native, Expo e Expo Router, incluindo dependência do cliente Socket.IO.
- [x]  Backend Node.js/Express com servidor Socket.IO.
- [x]  Criação de sala com código alfanumérico de quatro caracteres e verificação de colisão entre salas ativas.
- [x]  Entrada em sala com validação de código, prevenção de duplicidade e suporte reportado para até oito jogadores.
- [x]  Confirmação privada `room_joined` após entrada válida; fluxo de criação/entrada e lotação confirmado no smoke test local com clientes independentes em salas de 4 e 8 jogadores. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- [x]  Atualização do contador de jogadores e remoção de jogadores desconectados do estado em memória.
- [x]  Início manual pelo anfitrião com 4–8 jogadores, sem auto-start ao atingir quatro; distribuição dos quatro papéis ao menos uma vez, repetições para jogadores adicionais, envio privado do papel e transferência do anfitrião em desconexão. A suíte backend agora reporta 20 testes passando. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- [x]  Smoke test ponta a ponta local via Expo Web e Socket.IO (2026-11-08): etapa exigida para iniciar, etapa escolhida pelo anfitrião e visível aos demais, início manual, papel privado, transferência de anfitrião, suporte a 8 e rejeição do nono; relatório: aprovado. Sem conexão com Aiven. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- [x]  Integrar parcialmente o frontend ao gameplay: a tela em `frontend/src/app/index.tsx` emite `start_game`/`roll_dice` e trata `game_state_updated`/`obstacle_pending`; a interface do quiz e o tabuleiro completo ainda não estão implementados.
- [x]  Definir baseline do ciclo: ordem sorteada uma vez; dado de 6 lados; percurso de 20 casas; obstáculos em 4, 8, 12 e 16; quiz ao aterrissar; excedente limitado à chegada; fim após 8 rodadas completas, com desempate por posição, pontos de quiz e vitória compartilhada. Validar ritmo em playtest; o registro de indicadores para reflexão ainda não está implementado.
- [x]  Conexão MySQL/Aiven com CA validado e `GET /api/status` real retornando HTTP 200 (status informado por Ryan).
- [x]  Repositório de perguntas em `backend/repositories/questionRepository.js`, com filtros validados, query parametrizada `FROM perguntas`, projeção pública por allowlist e teste que confirma o uso do nome sem schema fixo. Os testes usam pool simulado e não comprovam consulta real à Aiven.
- [x]  Versionar `database/schema_e_seed.sql` com `CREATE TABLE IF NOT EXISTS` e nove questões, uma por combinação de Fundamental/Médio/Superior e nível estrutural 1/2/3. O seed evita inserir a mesma combinação de etapa, nível e enunciado novamente.
- [x]  Aplicar e validar `database/schema_e_seed.sql` em `defaultdb`: destino confirmado por `SELECT DATABASE()`, estrutura verificada, nove combinações cobertas e consulta real do repositório validada com projeção pública sem gabarito/explicação; conforme relatório do Executor em 2026-11-09. O backup Power-Soccer não foi restaurado nem alterado.
- [x]  Definir o contrato de eventos do quiz e os comportamentos para pergunta indisponível e desconexão durante a rodada; regras detalhadas em `docs/DATABASE_UML.md`.
- [x]  Definir tratamento de indisponibilidade e desconexão durante quiz: não iniciar rodada parcial; se faltar pergunta, emitir `QUESTIONS_UNAVAILABLE`, encerrar a pausa sem pontuar e avançar. Congelar os N participantes no início da rodada; desconexões contam como sem resposta/zero, sem recalcular a faixa de pontos. Decisão de Ryan em 2026-11-09.
- [x]  **Motor de turnos e quiz backend:** `backend/gameEngine.js` e `backend/lobby.js` implementam movimento, obstáculos, rodada de quiz, pontuação, fallbacks e desconexão. A suíte backend passou 52/52; TypeScript aprovado; lint sem erros e um aviso. Testado com mocks/doubles; ainda falta smoke test de gameplay com clientes Socket.IO reais.
- [x]  **Aceitar explicação opcional no quiz:** `backend/quizService.js` aceita `explicacao: null`; `backend/lobby.js` omite a explicação nula no resultado privado. Testes cobrem preparação e conclusão da rodada preservando envio privado, pontuação e campos obrigatórios. Backend `npm test`: 52/52; TypeScript aprovado; lint sem erros e um aviso. Ainda falta validar com clientes Socket.IO reais.

## 9. Esquema de Banco de Dados (Aiven SQL)

### Objetivo e decisões de modelagem

A tabela `perguntas` armazenará questões de múltipla escolha. `etapa_escolar` e `nivel_estrutural` são dimensões separadas: a primeira respeita o conteúdo escolar escolhido para a partida; a segunda segue a complexidade estrutural indicada pela Matriz de Equidade. O nível não representa a capacidade de uma pessoa.

A estrutura abaixo é compatível com MySQL no Aiven e contempla os campos solicitados, além de explicação pedagógica e tags, previstos no backlog. O índice ajuda a localizar perguntas por etapa e nível.

O script versionado [schema_e_seed.sql](../database/schema_e_seed.sql) é a fonte dos dados iniciais completos: inclui as nove combinações de etapa escolar e nível estrutural. Segundo a validação reportada pelo Executor, ele foi aplicado em `defaultdb` e as nove combinações foram confirmadas; os comandos SQL abaixo são referência de estrutura e exemplos de questões.

### SQL — referência da estrutura

O DDL abaixo documenta a estrutura. Para preparar o banco, use o script versionado `database/schema_e_seed.sql`, que inclui a tabela e os seeds completos:

```sql
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
```

`resposta_correta` guarda apenas a letra da alternativa. Na integração do quiz, mantenha essa informação no backend e não a envie ao app antes de a resposta do jogador ser validada.

### Exemplos de dados (Ensino Fundamental)

Os exemplos cobrem os três níveis estruturais: operação direta, problema em etapas e equação simples. As respostas corretas são, respectivamente, B, B e C.

```sql
INSERT INTO perguntas
    (etapa_escolar, nivel_estrutural, enunciado,
     opcao_a, opcao_b, opcao_c, opcao_d,
     resposta_correta, explicacao, tags)
VALUES
    ('Fundamental', 1,
     'Uma caixa tem 48 lápis. Se eles forem repartidos igualmente entre 6 alunos, quantos lápis cada aluno receberá?',
     '6', '8', '7', '9',
     'B', '48 dividido por 6 é igual a 8.',
     '["divisao", "operacoes_basicas"]');

INSERT INTO perguntas
    (etapa_escolar, nivel_estrutural, enunciado,
     opcao_a, opcao_b, opcao_c, opcao_d,
     resposta_correta, explicacao, tags)
VALUES
    ('Fundamental', 2,
     'Uma escola arrecadou 84 livros. Separou 18 para a biblioteca e dividiu o restante igualmente entre 3 turmas. Quantos livros cada turma recebeu?',
     '20', '22', '24', '26',
     'B', 'Primeiro: 84 - 18 = 66. Depois: 66 dividido por 3 = 22.',
     '["subtracao", "divisao", "problema_em_etapas"]');

INSERT INTO perguntas
    (etapa_escolar, nivel_estrutural, enunciado,
     opcao_a, opcao_b, opcao_c, opcao_d,
     resposta_correta, explicacao, tags)
VALUES
    ('Fundamental', 3,
     'O triplo de um número, menos 5, é igual a 28. Qual é esse número?',
     '9', '10', '11', '12',
     'C', 'Se 3x - 5 = 28, então 3x = 33 e x = 11.',
     '["equacao", "multiplicacao", "fundamental"]');
```

### Plano da próxima fase — validar banco e integrar gameplay

1. **Aplicação e validação inicial do banco — concluídas conforme relatório:** `database/schema_e_seed.sql` aplicado em `defaultdb`; estrutura, cobertura das nove combinações e consulta real do repositório verificadas.
2. **Integrar ao fluxo multiplayer:** conectar o quiz ao estado autoritativo de turno/obstáculo; abrir e encerrar a rodada, validar uma resposta por jogador e calcular a pontuação conforme as regras do GDD, mantendo gabarito privado.
3. **Validar o quiz ponta a ponta:** testar respostas corretas/incorretas, expiração dos 30 segundos, banco sem pergunta compatível e sincronização dos participantes antes de avançar para a interface completa do tabuleiro e quiz.

**Critérios de conclusão desta fase:** tabela criada no Aiven; três registros de teste consultáveis; conexão do backend usando variáveis de ambiente; consulta filtrada por etapa e nível; resposta correta protegida no servidor; testes básicos documentados.

[UML e Banco de Dados — Ludo Equidade](https://app.notion.com/p/UML-e-Banco-de-Dados-Ludo-Equidade-b5fe2dfa95b84b458270107189b3524c?pvs=21)