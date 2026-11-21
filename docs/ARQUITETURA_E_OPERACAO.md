# Arquitetura e Operação — Ludo Equidade (v2.0)

- **Atualizado em:** 2026-11-21
- **Escopo deste documento:** descreve a arquitetura **em produção hoje (v1.0)** e especifica o **contrato técnico alvo (v2.0)** que orienta as implementações de Backend (Etapa 4) e Frontend (Etapa 5).

---

## 1. Visão Geral do Sistema

O repositório é um monorepo com três camadas principais:

```text
Frontend (Expo Web / React Native — Vercel / Expo Go)
        │
        ├── Socket.IO (tempo real: lobby, turnos, dado, quiz, revanche)
        └── HTTPS REST JSON/CSV (auth Google, histórico, painel docente, analytics)
        ▼
Backend (Node.js + Express 5 + Socket.IO — Render)
        ├── Estado em memória (salas ativas, turnos, timers, reconexão 60s)
        └── Camada de persistência e serviços (mysql2/promise + TLS)
        ▼
MySQL 8 (Aiven `defaultdb` — portável para qualquer MySQL 8)
        ├── 9 Tabelas normalizadas (usuarios, turmas, matrizes, perguntas, partidas...)
        └── 5 Views analíticas e datasets anonimizados (ICE — UFRRJ)
```

### Separação de Responsabilidades
- **Frontend:** apresenta o jogo, gerencia o login opcional (Google ou Convidado), renderiza o Painel de Professores e envia intenções de ação. **Nunca** decide sorteio de dado, papel secreto, gabarito, latência oficial ou pontuação.
- **Backend (Autoritativo):** valida permissões e regras, mantém as partidas ativas em memória para latência mínima, mede `tempo_resposta_ms` no servidor, grava os dados transacionais ao final de cada partida e serve endpoints protegidos por RBAC.
- **Banco de Dados:** armazena o acervo governado de perguntas, contas/perfis, turmas, versões da matriz de equidade e o histórico analítico de partidas para o Painel de Professores e pesquisa científica.

---

## 2. Arquitetura do Frontend (`frontend/`)

Stack: **Expo SDK 53**, **React Native**, **Expo Router**, **TypeScript (`strict`)**, **React 19 + React Compiler (`experiments.reactCompiler: true`)**, **Reanimated** e `socket.io-client`.

### Estrutura Atual (v1.0) e Evolução Planejada (v2.0)
- `src/app/_layout.tsx` e `src/app/index.tsx`: entrada principal, tema claro/escuro/daltônico e navegação entre Lobby, Sala e Jogo.
- `src/hooks/useGameSession.ts`: conexão Socket.IO, estado da sala/partida, reconexão via `AppState` + `sessionToken` e cronômetro de quiz.
- `src/components/lobby/` (`SplashView`, `HomeView`, `RoomsView`): splash, perfil local, salas públicas/privadas, cópia do código e fechamento pelo anfitrião.
- `src/components/game/` (`BoardTrack`, `DicePanel`, `PlayersSidebar`, `QuizModal`, `GameOverModal`): trilha 0–30, dado, ranking/perspectiva, quiz simultâneo e revelação com métricas observadas.
- `src/components/ui/DuoComponents.tsx` e `src/constants/duoTheme.ts`: design system **Duo-Equidade** (profundidade exclusivamente via `borderWidth` e `borderBottomWidth`, **proibido `shadow*`**).
- **Novos módulos v2.0 (Etapa 5):**
  - `src/hooks/useAuth.ts`: estado de autenticação Google OAuth + modo convidado, token JWT e preferências (`consentimento_pesquisa`).
  - `src/app/perfil.tsx` (ou view dedicada): histórico pessoal de partidas e perspectivas vivenciadas (`4/4`).
  - `src/app/professor.tsx` (ou painel dedicado protegido por papel `professor`/`admin`): gestão do banco de perguntas, turmas, indicadores empíricos por questão e exportação CSV/JSON anonimizada.
  - Componentes de acessibilidade e narrativa viva (feed de eventos do turno, suporte a teclado na Web, ícones vetoriais e fluxo de revanche instantânea).

---

## 3. Arquitetura do Backend (`backend/`)

Stack: **Node.js (CommonJS)**, **Express 5**, **Socket.IO 4**, **mysql2/promise**, `cors`, `dotenv` (+ verificação criptográfica Google OAuth / JWT na v2.0).

### Módulos Atuais (v1.0)
- `server.js`: bootstrap, validação estrita de `CLIENT_ORIGIN` em produção, criação de HTTP + Socket.IO, wiring de serviços e shutdown gracioso (`SIGTERM`/`SIGINT`).
- `api.js`: endpoints REST (`GET /api/status`, `GET /api/perguntas`, `POST /api/perguntas`).
- `config/db.js`: pool `mysql2/promise` com validação de porta e TLS obrigatório (`rejectUnauthorized: true`) quando `DB_SSL=true`.
- `lobby.js`: ciclo de salas, rate limits por socket, sessão temporária com reconexão de 60s (inclusive durante quiz), expiração de salas ociosas em 30 min, orquestração de rodadas e eventos privados.
- `gameEngine.js`: motor puro do tabuleiro (`0..30`, dado, Impulso +2, obstáculos, limite de rodadas, desempate e estatísticas privadas por jogador).
- `quizService.js`: derivação de nível estrutural pela matriz e preparação de questões inéditas por rodada/partida.
- `repositories/questionRepository.js`: consultas parametrizadas com `excludeIds` e fallback automático.

### Evolução Modular (v2.0 — Etapa 4)
Para absorver contas, persistência e Painel de Professores mantendo alta testabilidade (injeção de dependências sem depender do banco nos testes unitários):

| Módulo | Responsabilidade |
| --- | --- |
| `utils/logger.js` | Logger estruturado (JSON em produção) separando eventos operacionais (`system`, `db`, `auth`) de eventos de jogo (`match`, `quiz`), com sanitização de campos sensíveis. |
| `services/authService.js` | Verificação de Google ID Token, emissão/validação de JWT próprio da aplicação (`HS256` com `JWT_SECRET` via `node:crypto` ou biblioteca dedicada) e helpers de RBAC (`jogador`, `professor`, `admin`). |
| `middleware/authMiddleware.js` | Extração opcional (`attachUser`) e obrigatória (`requireAuth`, `requireRole(['professor', 'admin'])`) + fallback `X-Question-Admin-Token`. |
| `repositories/userRepository.js` | Upsert por `google_sub`/`email`, busca por ID/UUID, atualização de preferências/consentimento e gestão de papéis. |
| `repositories/classRepository.js` | CRUD de `turmas` por professor e validação de código de turma ao criar sala. |
| `repositories/questionRepository.js` | Seleção aleatória filtrando `ativa = 1 AND status_revisao = 'aprovada'`, CRUD docente completo, atualização de status editorial e tratamento de erro de duplicata (`ER_DUP_ENTRY`). |
| `repositories/matchRepository.js` | Gravação transacional (`BEGIN ... COMMIT`) de `partidas`, `partida_participantes`, `partida_turnos`, `quiz_rodadas` e `quiz_respostas`, além de histórico pessoal do usuário. |
| `repositories/analyticsRepository.js` | Leitura das 5 views analíticas (`vw_desempenho_perguntas`, `vw_equidade_por_condicao`, `vw_matriz_empirica`, `vw_dataset_anonimo_participacoes`, `vw_dataset_anonimo_respostas`) com filtros parametrizados e serialização CSV/JSON. |
| `services/matchPersistenceService.js` | Converte o snapshot em memória da sala encerrada para o formato relacional e persiste de forma assíncrona e resiliente (erros de DB são logados sem impactar o `game_over`). |

---

## 4. Fluxo de Autenticação (Google OAuth + Convidado)

```text
1. Usuário clica "Entrar com Google" no Frontend (Web ou Mobile)
2. Google retorna `idToken` assinado ao cliente
3. Frontend envia POST /api/auth/google { idToken }
4. Backend valida assinatura, emissor e `aud === GOOGLE_CLIENT_ID`
5. Backend faz upsert em `usuarios` (gerando `uuid` se novo) e emite JWT da aplicação
6. Frontend usa o JWT em:
   - Header HTTP: `Authorization: Bearer <jwt>`
   - Handshake Socket.IO: `io(SERVER_URL, { auth: { token: jwt } })`
7. Convidados pulam os passos 1–5 e jogam normalmente com `sessionToken` temporário.
```

---

## 5. Contrato Formal de API REST

### 5.1 Saúde e Operação
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `GET /api/status` | Pública | ✅ v1.0 | Verifica `SELECT 1` no MySQL; retorna `200 { ok: true, db: "ok" }` ou `503` em falha/shutdown. |

### 5.2 Autenticação e Perfil Pessoal (v2.0)
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `POST /api/auth/google` | Pública | 🔜 v2.0 | Valida Google `idToken`, faz upsert em `usuarios` e retorna `{ token, user }`. |
| `GET /api/auth/me` | JWT | 🔜 v2.0 | Retorna perfil, papel de sistema (`jogador`/`professor`/`admin`) e estado de consentimento. |
| `PATCH /api/auth/me` | JWT | 🔜 v2.0 | Atualiza `apelido_padrao`, `avatar_padrao` e `consentimento_pesquisa` (registra `consentimento_em`). |
| `GET /api/me/partidas` | JWT | 🔜 v2.0 | Histórico paginado das partidas concluídas do usuário + contagem de perspectivas vivenciadas (`4/4`). |

### 5.3 Banco de Perguntas (Público / Docente)
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `GET /api/perguntas` | Pública (sem gabarito) / Docente (completo com `?includeAnswer=true`) | ✅ v1.0 / 🔜 v2.0 | Lista perguntas com filtros (`etapa`, `nivel`, `area`, `status`, `ativa`). Usuários públicos **nunca** recebem `resposta_correta`. |
| `POST /api/perguntas` | `professor`/`admin` ou `X-Question-Admin-Token` | ✅ v1.0 / 🔜 v2.0 | Cadastra nova questão com validação estrita; retorna `409` se `enunciado_hash` já existir. |
| `PUT /api/perguntas/:id` | `professor`/`admin` | 🔜 v2.0 | Edita enunciado, alternativas, gabarito, explicação, área temática, BNCC e tags. |
| `PATCH /api/perguntas/:id/status` | `professor`/`admin` | 🔜 v2.0 | Atualiza `status_revisao` (`rascunho`/`em_revisao`/`aprovada`/`arquivada`) e `ativa`. |

### 5.4 Turmas, Analytics e Administração (v2.0)
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `GET /api/turmas` | `professor`/`admin` | 🔜 v2.0 | Lista turmas do professor (ou todas para `admin`). |
| `POST /api/turmas` | `professor`/`admin` | 🔜 v2.0 | Cria turma com código único (ex.: `MAT101-2026A`) e etapa padrão. |
| `PATCH /api/turmas/:id` | `professor`/`admin` | 🔜 v2.0 | Edita nome, etapa padrão ou ativa/desativa a turma. |
| `GET /api/analytics/overview` | `professor`/`admin` | 🔜 v2.0 | KPIs gerais (partidas, participantes, acertos, distribuição de etapas) com filtros opcionais (`turma`, `etapa`, `matriz`). |
| `GET /api/analytics/perguntas` | `professor`/`admin` | 🔜 v2.0 | Consulta `vw_desempenho_perguntas` (facilidade $p$, tempo médio, distribuição de distratores). |
| `GET /api/analytics/equidade` | `professor`/`admin` | 🔜 v2.0 | Consulta `vw_equidade_por_condicao` e `vw_matriz_empirica`. |
| `GET /api/analytics/export` | `professor`/`admin` | 🔜 v2.0 | Exporta dataset anonimizado (`dataset=participacoes|respostas`, `format=csv|json`) exclusivamente para registros com `consentiu_pesquisa = 1`. |
| `GET /api/admin/usuarios` | `admin` | 🔜 v2.0 | Lista usuários cadastrados para gestão de papéis. |
| `PATCH /api/admin/usuarios/:id/papel` | `admin` | 🔜 v2.0 | Promove/altera `papel_sistema` (`jogador` / `professor` / `admin`). |

---

## 6. Contrato Formal de Eventos Socket.IO

### 6.1 Cliente → Servidor
| Evento | Payload principal | Status | Rate limit (/min) |
| --- | --- | --- | :---: |
| `create_room` | `{ name, avatarId, isPrivate, sessionToken?, quizDurationSec?, maxRounds?, turmaCodigo?, consentResearch? }` | ✅ v1.0 / 🔜 v2.0 | 5 |
| `list_rooms` | *(nenhum)* | ✅ v1.0 | 30 |
| `join_room` | `{ roomCode, name, avatarId, sessionToken?, consentResearch? }` | ✅ v1.0 / 🔜 v2.0 | 30 |
| `resume_room` | `{ roomCode, sessionToken }` | ✅ v1.0 | 10 |
| `set_school_stage` | `{ roomCode, schoolStage }` | ✅ v1.0 | 20 |
| `update_room_settings` | `{ roomCode, quizDurationSec?, maxRounds?, turmaCodigo? }` | 🔜 v2.0 | 20 |
| `start_game` | `{ roomCode }` | ✅ v1.0 | 10 |
| `roll_dice` | `{ roomCode }` | ✅ v1.0 | 20 |
| `submit_quiz_answer` | `{ quizId, alternativa }` + callback ack `{ success, code? }` | ✅ v1.0 | 30 |
| `play_again` | `{ roomCode }` (anfitrião reinicia sala pós-`game_over` mantendo jogadores) | 🔜 v2.0 | 10 |
| `leave_room` | *(nenhum)* | ✅ v1.0 | — |
| `close_room` | `{ roomCode }` | ✅ v1.0 | — |

### 6.2 Servidor → Cliente
| Evento | Destino | Payload resumido | Status |
| --- | --- | --- | --- |
| `rooms_updated` | Global / socket | `{ rooms: PublicRoomSummary[] }` | ✅ v1.0 |
| `room_created` / `room_joined` / `room_resumed` | Socket | Dados da sala, `sessionToken`, `players`, configurações e `condition` (no resume) | ✅ v1.0 |
| `room_updated` | Sala | `roomCode`, `hostId`, `isPrivate`, `schoolStage`, `quizDurationSec`, `maxRounds`, `turmaCodigo`, `started`, `players` | ✅ v1.0 / 🔜 v2.0 |
| `room_left` / `room_closed` / `room_error` | Socket | Feedback explícito de saída, encerramento ou erro | ✅ v1.0 |
| `game_started` | Socket individual | `{ condition }` (privado!) | ✅ v1.0 |
| `game_state_updated` | Sala | `{ positions, quizPoints, currentPlayerId, round, maxRounds, diceResult, status, lastEvent? }` | ✅ v1.0 / 🔜 v2.0 |
| `obstacle_pending` | Sala | `{ playerId, position, obstacleName, round }` | ✅ v1.0 |
| `quiz_question` | Socket individual | `{ quizId, enunciado, alternativas: { A, B, C, D }, deadlineAt, durationSec }` | ✅ v1.0 |
| `quiz_result` | Socket individual | `{ quizId, alternativa, correta, pontos, bonusMove?, respostaCorreta, explicacao? }` | ✅ v1.0 / 🔜 v2.0 |
| `quiz_error` | Sala | `{ quizId, code: "QUESTIONS_UNAVAILABLE" | "QUIZ_UNAVAILABLE" }` | ✅ v1.0 |
| `quiz_round_ended` | Sala | `{ quizId, placar, motivo, fastestCorrectPlayerId? }` | ✅ v1.0 / 🔜 v2.0 |
| `game_over` | Sala | `{ winners, quizHighlights?, reason, roles, reveal: [...stats], persisted? }` | ✅ v1.0 / 🔜 v2.0 |

---

## 7. Deploy, Variáveis de Ambiente e Operação

### Render (Backend)
- **Root Directory:** `backend` · **Build:** `npm ci` · **Start:** `npm start` · **Health Check:** `/api/status`
- **Variáveis ativas (v1.0):** `PORT`, `NODE_ENV=production`, `CLIENT_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, `DB_CA_CERT`, `QUESTION_ADMIN_TOKEN`.
- **Variáveis adicionais (v2.0 — opcionais até ativar OAuth):**
  - `GOOGLE_CLIENT_ID`: Client ID OAuth Web/Expo do Google (se ausente, login Google responde `503` sem afetar o modo Convidado).
  - `JWT_SECRET`: segredo forte (mín. 32 bytes) para assinar tokens de sessão.
  - `BOOTSTRAP_ADMIN_EMAIL`: opcional — promove automaticamente o e-mail especificado a `admin` no primeiro login Google.

### Vercel (Frontend Web)
- **Root Directory:** `frontend` · **Build:** `npm run build:web` · **Output:** `dist`
- **Variáveis:** `EXPO_PUBLIC_SERVER_URL` (+ `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` na v2.0, ambos públicos).

### Segurança, Limitações Conhecidas e Evolução
- **Single-instance em memória:** reinício ou novo deploy no Render encerra partidas em andamento (partidas já concluídas ficam salvas no MySQL na v2.0). Escala horizontal futura exigirá Redis + `@socket.io/redis-adapter`.
- **Rate limiting e proteção:** limites por socket já ativos no lobby; adicionar rate limit leve em endpoints públicos de autenticação/listagem na v2.0 e headers HTTP defensivos (`X-Content-Type-Options`, `X-Frame-Options`).
- **Banco de dados:** o Aiven MySQL Free Tier atual permanece ativo durante o ciclo de desenvolvimento/apresentação (encerramento previsto em **2026-12-21**). Como o schema usa exclusivamente SQL padrão MySQL 8, a migração futura para outro provedor será direta via backup/restore + variáveis de conexão.
- **Privilégios mínimos e logs:** nunca registrar tokens, senhas, SQL com credenciais ou PII em logs; criar usuário MySQL dedicado sem privilégios administrativos para produção.
