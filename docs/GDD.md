# GDD - JOGO DA INCLUSAO

# 🎲 GDD — Ludo Equidade (nome provisório)

## 1. Visão Geral

- **Gênero:** jogo de tabuleiro educativo, multiplayer online e assimétrico.
- **Participantes — regra aprovada e implementada:** mínimo de 4 e máximo de 8; a partida começa manualmente pelo anfitrião, sem início automático ao chegar a quatro. Se o anfitrião desconectar, a função passa ao próximo jogador da sala. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- **Plataforma-alvo:** mobile, com React Native e Expo Router.
- **Objetivo:** ensinar matemática e promover reflexão sobre equidade e inclusão por meio de obstáculos inspirados em barreiras do cotidiano.
- **Ciclo implementado no backend e integrado ao frontend:** entrar em uma sala → escolher etapa escolar → iniciar manualmente → receber papel privado → jogar em turnos → rolar o dado e avançar → ao aterrissar em obstáculo, responder a um quiz simultâneo de 30 segundos → pontuar e avançar o turno ou encerrar a partida. O frontend já exibe o tabuleiro, o quiz e o estado de fim; a validação visual de alguns cenários excepcionais e do app nativo continua pendente.
- **Tecnologias:** frontend React Native/Expo; backend Node.js, Express e Socket.IO; MySQL no Aiven (banco ativo confirmado como `defaultdb` para o protótipo).
- **Repositório:** [jogoInclusao_UFRRJ](https://github.com/RyanDavid-RJ/jogoInclusao_UFRRJ).
- **Origem:** ideia inspirada na SNCT da UFRRJ e em um trabalho sobre educação especial de uma turma de licenciatura. O desenvolvedor é estudante de Matemática Aplicada e Computacional na UFRRJ, com formação técnica em Eletrônica e Desenvolvimento de Sistemas (SENAI) e experiência como desenvolvedor aprendiz no Petrobras CENPES.

### Princípio de design

A condição sorteada representa uma perspectiva de jogo; não define a capacidade, inteligência ou dificuldade de aprendizagem de uma pessoa real. A matriz é uma abstração de barreiras ambientais para fins pedagógicos e deve ser validada com pessoas com deficiência, educadores e especialistas. O jogo deve oferecer acessibilidade para todos, sem transformar uma deficiência em estereótipo.

### Guia visual — Duo-Equidade

- **Direção:** geometria arredondada, minimalismo estrutural, cartões com hierarquia clara e microinterações leves; a interface deve parecer acolhedora e tátil sem competir com a leitura do jogo.
- **Paleta principal:** verde `#58CC02`, azul `#1CB0F6`, amarelo `#FFC800`, roxo `#CE82FF` e vermelho `#FF4B4B`.
- **Superfícies:** usar `#F7F9FA` e outros tons pastéis/off-white no lugar de cinza puro; reservar cores vibrantes para ações, estados, progresso e destaque.
- **Profundidade e interação:** priorizar sombras planas com borda inferior tátil em `borderBottomWidth`; usar Reanimated apenas para feedback curto e compreensível, respeitando redução de movimento.
- **Identidade do jogador:** durante a partida, nome e avatar animal/personagem são a identidade pública; o avatar não deve sugerir a condição secreta. A transformação visual para uma representação humana ilustrativa ocorre somente na revelação pós-jogo.

### Fluxo inicial, perfil e salas — requisito aprovado para a próxima fase

- **Splash:** ao abrir o app, exibir uma tela curta de carregamento com a identidade visual do jogo e encaminhar o jogador para a tela inicial.
- **Tela inicial:** permitir escolher um avatar, informar um nick editável e acessar **Salas** ou **Criar sala**. O retorno de ambas as telas deve levar novamente à tela inicial.
- **Login externo:** oferecer a alternativa de login com Google. Quando autenticado, usar o nome da conta como nick inicial e a foto de perfil como avatar inicial; ambos devem poder ser substituídos pelo jogador dentro das regras do produto. O logout deve ficar disponível na tela inicial autenticada.
- **Lista de salas públicas:** mostrar somente salas públicas abertas, com avatar e nome do anfitrião e quantidade atual de participantes. A entrada deve exigir uma sala ainda disponível, respeitando o limite de 8 jogadores e a regra de início manual com no mínimo 4.
- **Entrada privada:** disponibilizar na tela de salas um campo para informar o código de uma sala privada. Código inválido, sala inexistente ou sala lotada devem produzir feedback explícito, sem alterar o estado local para uma entrada bem-sucedida.
- **Criação de sala:** permitir escolher entre sala pública, listada em **Salas**, e sala privada, acessível somente pelo código. Depois da criação, mostrar a sala com os participantes, seus avatares e nicks, a dificuldade/etapa escolhida pelo anfitrião e o estado de prontidão.
- **Sala criada:** o anfitrião pode sair e fechar a sala antes do início; a ação deve pedir confirmação e limpar a sessão local. O botão de iniciar só fica habilitado com pelo menos 4 participantes e deve preservar o limite máximo de 8 e o início manual já definido.
- **Referência visual:** as capturas de Gartic apresentadas por Ryan são referência de composição e hierarquia, não de cópia de identidade visual. Aplicar o guia Duo-Equidade e manter controles acessíveis, feedback textual e navegação de retorno.
- **Escopo do MVP:** primeiro implementar o fluxo de splash, perfil local, salas públicas/privadas e navegação. Login Google exige definição do provedor OAuth, redirect/deep link e contrato de identidade antes de ser considerado concluído.

## 2. Papéis e Condições

- Papéis possíveis: cadeirante; pessoa com deficiência visual (cegueira/baixa visão); pessoa com deficiência auditiva (surdez); pessoa neuroatípica.
- **Distribuição aprovada:** em cada partida, sortear os quatro papéis de modo que cada um apareça ao menos uma vez; participantes adicionais (até o máximo de 8) recebem um dos quatro papéis sorteado com repetição. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
- **Sigilo e revelação implementados:** cada pessoa recebe somente o próprio papel durante a partida; após o encerramento, `game_over` revela publicamente o mapeamento jogador–papel junto do resultado final. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)

Os papéis cruzam-se com o obstáculo ativo para selecionar a intensidade do desafio matemático. As experiências são diversas; os rótulos da matriz são uma regra provisória do jogo, não uma descrição universal das pessoas representadas.

### Revelação e reflexão pós-jogo

- Durante a partida, cada pessoa vê o próprio nome e um avatar lúdico (animal/personagem), sabe o próprio papel e não vê os papéis dos demais. O avatar não indica deficiência.
- Depois de anunciar o campeão, revelar a correspondência jogador–papel e animar/apresentar cada avatar como uma figura humana ilustrativa do papel. Variar gênero, tom de pele, cabelo e outros traços com diversidade, sem sugerir que essa figura é a aparência real do jogador nem associar uma deficiência a uma raça ou gênero.
- A síntese pode separar fatores observados: sorte e movimento (dados, casas bônus/multiplicadores), exposição a obstáculos e níveis estruturais, desempenho matemático (acertos, ordem de resposta e pontos) e progresso no tabuleiro.
- Usar perguntas para estimular debate — por exemplo, se sorte, desafios enfrentados e desempenho matemático contribuíram de formas diferentes para o resultado — sem afirmar que os dados provam causalidade ou representam a experiência universal de uma deficiência.
- No MVP, manter os indicadores somente no estado temporário; não é necessário persistir histórico no banco. Validar linguagem, matriz, personagens e dinâmica com pessoas com deficiência e educadores. A peça de quebra-cabeça para neurodivergência/autismo é debatida por pessoas autistas; não fechar esse símbolo sem consulta comunitária. [[1]](https://pubmed.ncbi.nlm.nih.gov/28823194/)
- **Status (2026-11-20):** a associação jogador–papel é revelada após o encerramento por `game_over`, e `GameOverModal` já exibe a transição visual inicial e perguntas de reflexão. Ilustrações humanas diversas, métricas observadas da partida (dados/bônus/obstáculos/acertos) e validação pedagógica continuam propostas a evoluir e validar. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)

## 3. Regras do Jogo — Rascunho Jogável

1. **Sala — implementada:** a partida comporta de 4 a 8 jogadores e o anfitrião escolhe Fundamental, Médio ou Superior e inicia manualmente quando o grupo estiver pronto. Não há início automático ao chegar a quatro. Se o anfitrião desconectar, o próximo jogador assume. O servidor exige uma etapa válida para iniciar e bloqueia alterações depois do início.
2. **Sorteio, sigilo e revelação — implementados:** os quatro papéis aparecem ao menos uma vez; participantes adicionais recebem papéis sorteados com repetição; cada jogador recebe privadamente apenas seu próprio papel durante a partida; `game_over` revela o mapa completo após o encerramento. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
3. **Ordem e movimento — implementados no backend:** a ordem é sorteada uma vez ao iniciar; o servidor rola um dado de 6 lados e move o peão no percurso compartilhado da posição 0 à 30. Aterrissar exatamente nas posições 7, 14, 21 ou 28 pausa a partida e inicia a preparação do quiz; passar por cima não ativa. Movimento excedente é limitado à posição 30.
4. **Casas bônus e quiz por obstáculo — implementados e integrados:** ao aterrissar exatamente nas casas 5, 10, 15, 20 ou 25, o jogador recebe **Impulso (+2 casas)**, limitado à chegada na casa 30. O impulso não reativa um obstáculo que tenha sido apenas ultrapassado; obstáculos só são acionados pelo pouso original exato em 7, 14, 21 ou 28. Nesse caso, o servidor deriva o nível pelo papel e pela matriz, busca uma pergunta para cada participante pela etapa da sala e só envia perguntas individuais depois que todas foram encontradas.
5. **Quiz — integrado no backend:** todos os participantes conectados recebem uma pergunta individual; o servidor controla prazo comum de 30 segundos e aceita no máximo uma resposta por jogador. O gabarito e a explicação, quando disponível, são enviados apenas ao próprio jogador após a validação. Questões sem explicação são válidas; o resultado privado omite esse campo quando nulo.
6. **Pontuação — implementada no backend:** para N participantes fixados no início da rodada, acertos pontuam N, N−1, ... pela ordem de recebimento no servidor; erro, timeout ou desconexão vale zero, sem recalcular N. O cliente não escolhe o gabarito. [[1]](https://app.notion.com/chat?t=40cc1da9eec68082b1f200a9fe207e32)
7. **Fim e desempate — implementados no motor backend:** a partida termina imediatamente quando alguém chega à posição 30, inclusive após um Impulso (+2 casas). Se ninguém chegar ao fim após 8 rodadas completas, vence quem estiver mais avançado; em empate de posição, vence quem tiver mais pontos de quiz; persistindo o empate, há campeões compartilhados. Os pontos do quiz são acumulados no estado e usados no desempate. Validar duração e ritmo em playtest.

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
- **API REST de perguntas — implementada:** `GET /api/perguntas` lista as perguntas disponíveis e `POST /api/perguntas` cadastra uma nova pergunta, com validação de etapa escolar, nível estrutural, alternativas e resposta correta.
- **Ranking aprovado:** para N participantes, os acertos recebem N, N−1, ... até 1 ponto pela ordem de recebimento pelo servidor; erro e tempo esgotado valem zero.
- **Decisões ainda em aberto:** quantidade/não-repetição de perguntas dentro da mesma partida; validação em campo da reconexão durante quiz ativo (janela de 60 segundos, reentrega da pergunta e aceite da resposta já implementados e cobertos por testes no backend).

## 6. Acessibilidade e Experiência

- Oferecer alternativas visuais e textuais para alertas sonoros; não depender apenas de cor para comunicar estado.
- Planejar suporte a leitor de tela, contraste ajustável, textos legíveis, controles simples e tempo configurável ou opções de acessibilidade.
- Evitar estímulos sonoros/visuais excessivos; permitir reduzir movimento e efeitos.
- Testar protótipos com pessoas com diferentes necessidades de acesso e ajustar a matriz com base no retorno.