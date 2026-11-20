# Arquitetura e Operação — Ludo Equidade

## 1. Visão geral

O sistema é um monorepo com três partes principais:

```text
Navegador ou Expo Go
        |
        | HTTP + Socket.IO
        v
Backend Node.js + Express + Socket.IO
        |
        | mysql2/promise
        v
MySQL hospedado no Aiven
```

O frontend apresenta o jogo e envia ações. O backend valida as ações, mantém o
estado autoritativo da partida e consulta perguntas. O banco guarda o conteúdo
das perguntas, não o estado ativo das partidas.

## 2. Frontend

O frontend está em `frontend/` e usa Expo (SDK 53), React Native, Expo Router,
TypeScript, React Compiler (`experiments.reactCompiler: true`) e
`socket.io-client`.

Estrutura principal em `frontend/src/`:

- `app/index.tsx`: composição responsiva desktop/mobile, tema claro/escuro e
  modo daltônico;
- `hooks/useGameSession.ts`: conexão Socket.IO, estado de sessão/sala/jogo,
  reconexão via `AppState` e temporizador do quiz;
- `components/lobby/` (`SplashView`, `HomeView`, `RoomsView`): carregamento,
  perfil local, criação pública/privada, cópia do código, listagem pública,
  entrada por código e sala de espera (com fechamento pelo anfitrião);
- `components/game/` (`BoardTrack`, `DicePanel`, `PlayersSidebar`, `QuizModal`,
  `GameOverModal`): trilha 0–30, dado animado com gesto e rodada, ranking/perspectiva,
  quiz simultâneo e revelação/reflexão final com métricas observadas;
- `components/ui/DuoComponents.tsx` e `constants/duoTheme.ts`: design system
  Duo-Equidade (profundidade por `borderWidth`/`borderBottomWidth`, sem `shadow*`)
  e paletas claro/escuro/daltônico.

Responsabilidades:

- exibir splash, perfil, lobby público/privado, sala, tabuleiro, quiz e
  resultado;
- abrir a conexão Socket.IO e tentar retomar a sessão em quedas transitórias
  (`resume_room` + `sessionToken`, inclusive ao retornar ao primeiro plano via
  `AppState`);
- mostrar somente as ações permitidas pelo estado recebido;
- enviar criação/entrada de sala, escolha da etapa, início, rolagem e resposta;
- apresentar erros de sala e conexão sem ocultar falhas de operação;
- oferecer tema claro/escuro, modo daltônico e respeito à redução de movimento
  (`useReducedMotion`) sem alterar as regras do jogo;
- limpar o estado local ao sair/fechar a sala ou quando a retomada de sessão
  falhar (`room_error`);
- nunca decidir o gabarito ou a pontuação.

O mesmo código é preparado para web e mobile. O deploy atual utiliza:

- Build: `npm run build:web`;
- Saída: `dist`;
- Hospedagem: Vercel;
- URL publicada: <https://jogoinclusaoufrrj.vercel.app/>.

`EXPO_PUBLIC_SERVER_URL` é uma configuração pública do cliente e deve apontar
para o backend Render. Não deve conter senha ou outro segredo.

## 3. Backend

O backend está em `backend/` e é iniciado por `node server.js` ou `npm start`.

### `server.js`

- carrega variáveis de ambiente;
- valida e configura CORS (exigindo `CLIENT_ORIGIN` explícito e sem `*` quando
  `NODE_ENV=production`);
- instancia a aplicação Express via `api.js` e cria os servidores HTTP e
  Socket.IO;
- cria o pool MySQL via `config/db.js`;
- registra os handlers do lobby e trata `SIGTERM`/`SIGINT` com encerramento
  gracioso.

### `api.js`

Expõe os endpoints REST da aplicação:

- `GET /api/status`: verifica conectividade com o MySQL (`SELECT 1`) e retorna
  `503` durante o encerramento do processo;
- `GET /api/perguntas`: lista perguntas sem o campo `resposta_correta`;
- `POST /api/perguntas`: cadastra nova pergunta com validação de campos,
  protegido pelo cabeçalho `X-Question-Admin-Token` (`QUESTION_ADMIN_TOKEN`).

### `config/db.js`

- valida `DB_PORT` e cria o pool `mysql2/promise`;
- configura TLS obrigatório (`rejectUnauthorized: true`) quando `DB_SSL=true`,
  carregando o certificado CA de `DB_CA_PATH` ou `DB_CA_CERT`.

### `lobby.js`

Coordena salas, sockets e eventos multiplayer:

- cria, lista, entra, sai e fecha salas (`close_room`);
- aplica limites de frequência (rate limiting) por socket nos eventos sensíveis;
- gerencia sessão temporária (`sessionToken`) e reconexão por até 60 segundos
  (`resume_room` / `room_resumed`);
- expira salas de espera inativas após 30 minutos;
- valida perfis e permissões do anfitrião;
- inicia a partida;
- chama o motor para rolagem e movimentação;
- inicia e encerra rodadas de quiz;
- trata desconexões e transferência de anfitrião.

### `gameEngine.js`

Contém as regras puras do tabuleiro:

- posições (trilha de 0 a 30);
- ordem de turnos;
- dado de seis lados;
- casas bônus de Impulso (+2) em 5, 10, 15, 20 e 25;
- obstáculos em 7, 14, 21 e 28;
- limite de 8 rodadas;
- pontuação;
- condição de término;
- desempates;
- estatísticas privadas por participante (`stats` e `recordQuizOutcome`:
  rolagens e soma dos dados, impulsos, obstáculos, acertos e níveis enfrentados
  N1/N2/N3), mantidas fora de `getPublicGameState` para preservar o sigilo do
  papel e reveladas somente em `game_over.reveal[i].stats`.

### `quizService.js`

Coordena a preparação das perguntas, derivando o nível estrutural conforme o
obstáculo e o papel do jogador. Evita repetição dentro da mesma rodada e da
mesma partida propagando `usedQuestionIds` como exclusão (com fallback
automático caso o acervo da combinação se esgote) e garante que o backend não
envie gabarito antes da resposta ser validada.

### `questionRepository.js`

Executa consultas parametrizadas em `perguntas`, filtrando por etapa escolar,
nível estrutural e lista opcional `excludeIds` (`AND id NOT IN (...)`, com
fallback automático sem exclusão se não houver novas questões). A projeção
pública contém apenas enunciado e alternativas.

## 4. Estado e ciclo de uma partida

O ciclo simplificado é:

1. socket cria a sala;
2. sockets entram e recebem `room_updated`;
3. o anfitrião escolhe a etapa;
4. o anfitrião inicia;
5. o servidor cria o estado do jogo e distribui cada papel individualmente;
6. o jogador do turno envia `roll_dice`;
7. o servidor atualiza a posição;
8. se houver pouso exato em obstáculo, o servidor busca todas as perguntas;
9. cada participante recebe uma pergunta privada;
10. respostas são validadas no servidor;
11. o quiz termina por respostas completas ou prazo;
12. o servidor pontua e libera o próximo turno;
13. o jogo termina por posição 30 ou limite de rodadas;
14. `game_over` revela o resultado final.

Eventos privados, como `game_started`, `quiz_question` e `quiz_result`, são
enviados ao socket correspondente. Eventos de estado compartilhado são
enviados à sala.

## 5. Banco de dados

O banco atual é MySQL no Aiven, com `defaultdb` como banco de aplicação
confirmado para o protótipo, populado com **27 perguntas únicas balanceadas**
(3 para cada uma das 9 combinações de etapa escolar × nível estrutural). Os
scripts versionados estão em `database/schema_e_seed.sql` (schema + seed
inicial das nove combinações) e `database/perguntas_expansao.sql` (expansão de
perguntas), ambos idempotentes contra inserções duplicadas.

A tabela `perguntas` contém:

- etapa escolar;
- nível estrutural;
- enunciado;
- quatro alternativas;
- resposta correta;
- explicação opcional;
- tags.

`GET /api/perguntas` usa uma projeção sem `resposta_correta`. O cadastro via
`POST /api/perguntas` exige `QUESTION_ADMIN_TOKEN` no cabeçalho
`X-Question-Admin-Token`; CORS não substitui essa autenticação.

O gabarito permanece disponível apenas no servidor. A aplicação usa TLS quando
`DB_SSL=true` e recebe o certificado CA por arquivo seguro ou variável de
ambiente. Credenciais e certificados não pertencem ao repositório.

## 6. Deploy atual

### Render

- Root Directory: `backend`;
- Build Command: `npm ci`;
- Start Command: `npm start`;
- Health Check: `/api/status`;
- variáveis: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
  `DB_NAME`, `DB_SSL`, `DB_CA_CERT`, `CLIENT_ORIGIN`, `QUESTION_ADMIN_TOKEN` e
  `NODE_ENV=production`.
- `NODE_ENV=production` deve ser configurado no serviço. Nesse modo, o
  processo não inicia sem `CLIENT_ORIGIN` explícito e não aceita `*`.

### Vercel

- Root Directory: `frontend`;
- Build Command: `npm run build:web`;
- Output Directory: `dist`;
- variável: `EXPO_PUBLIC_SERVER_URL`.

## 7. Limitações operacionais conhecidas

O mapa `rooms` e os estados das partidas vivem na memória de uma única
instância. Portanto:

- reinício do processo perde salas e partidas;
- deploy durante uma partida desconecta os jogadores;
- escala horizontal exige armazenamento compartilhado e adapter Socket.IO;
- a reconexão temporária restaura a sessão por até 60 segundos, mas não
  sobrevive a reinício ou deploy;
- o **Aiven MySQL Free Tier encerra em 2026-12-21** (backup local salvo;
  migração de provedor MySQL planejada antes desse prazo).

Essas limitações são aceitas para o MVP e devem ser resolvidas antes de um
lançamento com tráfego imprevisível.

## 8. Segurança e operação recomendadas

- definir `NODE_ENV=production` e `CLIENT_ORIGIN` sem usar `*` em produção;
- limitar criação, listagem e entrada de salas;
- aplicar limites de frequência também aos eventos de retomada, rolagem e resposta;
- expirar salas de espera inativas após 30 minutos;
- criar usuário MySQL próprio com privilégios mínimos;
- manter logs sem senhas, tokens ou conteúdo sensível;
- monitorar o health check;
- o processo sinaliza indisponibilidade no health check antes de fechar
  Socket.IO, HTTP e o pool do banco ao receber `SIGTERM` ou `SIGINT`;
- registrar erros com contexto suficiente para diagnóstico;
- não coletar nome, imagem ou analytics sem uma política adequada de privacidade.

