# Arquitetura e Operação — Ludo Equidade (v2.1)

- **Atualizado em:** 2026-11-22
- **Estado:** Versão institucional **v2.1** implementada e em produção (Render + Vercel + MySQL 8 no Aiven com migrações `001..003` aplicadas e Google OAuth ativo).

---

## 1. Visão Geral do Sistema

O repositório é um monorepo com três camadas principais:

```text
Frontend (Expo Web / React Native — Vercel / Expo Go)
        │
        ├── Socket.IO (tempo real: lobby, turnos, dado, quiz, reconexão, revanche)
        └── HTTPS REST JSON/CSV (auth Google, histórico, painel docente, analytics)
        ▼
Backend (Node.js + Express 5 + Socket.IO — Render)
        ├── Estado em memória (salas ativas, turnos, timers, reconexão 60s, abandono)
        └── Camada de persistência e serviços (mysql2/promise + TLS)
        ▼
MySQL 8 (Aiven `defaultdb` — portável para qualquer MySQL 8)
        ├── 9 Tabelas normalizadas (usuarios, turmas, matrizes, perguntas, partidas...)
        └── 5 Views analíticas e datasets anonimizados (ICE — UFRRJ)
```

### Separação de Responsabilidades
- **Frontend:** apresenta o jogo, gerencia o login opcional (Google OAuth ou Convidado), renderiza o Perfil e o Painel Docente (com gráficos/heatmap) e envia intenções de ação. **Nunca** decide sorteio de dado, papel secreto, gabarito, latência oficial ou pontuação.
- **Backend (Autoritativo):** valida permissões e regras, mantém as partidas ativas em memória para latência mínima, mede `tempo_resposta_ms` no servidor, grava os dados transacionais ao final de cada partida e serve endpoints protegidos por RBAC.
- **Banco de Dados:** armazena o acervo governado de perguntas, contas/perfis, turmas, versões da matriz de equidade e o histórico analítico de partidas para o Painel de Professores e pesquisa científica.

---

## 2. Arquitetura do Frontend (`frontend/`)

Stack: **Expo SDK 53**, **React Native**, **Expo Router**, **TypeScript (`strict`)**, **React 19 + React Compiler (`experiments.reactCompiler: true`)**, **Reanimated** e `socket.io-client`.

### Estrutura Implementada (v2.1)
- `src/app/_layout.tsx` e `src/app/index.tsx`: entrada principal, tema claro/escuro/daltônico, efeitos sonoros (`🔊/🔇`), link direto `?sala=XXXX`, guia rápido (`❓ Regras`) e navegação entre Lobby, Sala, Jogo, Perfil e Painel Docente.
- `src/app/privacidade.tsx` e `src/app/termos.tsx`: páginas estáticas institucionais de **Política de Privacidade (LGPD — ICE/UFRRJ)** e **Termos de Uso** (exportadas em `/privacidade` e `/termos`).
- `src/hooks/useAuth.ts` e `src/services/apiClient.ts`: autenticação Google OAuth (GIS Web), JWT persistido com recuperação automática pós-*cold start* no Render, consentimento LGPD opt-in (logado e convidado) e desbloqueio docente via token administrativo.
- `src/hooks/useGameSession.ts`: conexão Socket.IO com handshake JWT opcional, persistência de `{ roomCode, sessionToken }` em `sessionStorage` para retomada automática após F5/recarregamento, estado de `reconnectingPlayers`, configurações de sala (`30/45/60s`, `6/8` rodadas, turma), revanche (`play_again`) e cronômetro de quiz.
- `src/components/auth/GoogleSignInButton.tsx`: botão oficial Google Identity Services em `<div>` nativo, consumo automático de `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || serverGoogleClientId` e detecção de bloqueadores de navegador com botão de recarga.
- `src/components/lobby/` (`SplashView`, `HomeView`, `RoomsView`): layout responsivo 2 colunas, banner de convite por link/QR Code, salas públicas com badges, sala de espera com QR Code nativo (`RoomQrCode`), cópia de link/código, barra de prontidão e controles completos do anfitrião.
- `src/components/game/` (`BoardTrack`, `DicePanel`, `PlayersSidebar`, `QuizModal`, `GameOverModal`):
  - `BoardTrack`: mini-trilha panorâmica `0 ─── 30`, grade sinuosa 5 colunas (desktop) / 3 colunas (mobile), peões animados (`ZoomIn`) e callout da última jogada.
  - `DicePanel`: dado geométrico 3×3 animado (ciclo de faces + rotação/mola + pulso na sua vez), barra de rodadas, feed narrativo (`lastEvent`) e contador de reconexão quando o jogador da vez cai.
  - `PlayersSidebar`: ranking ao vivo (`🥇🥈🥉`), modo privacidade (`🙈 Ocultar` papel), lista de `reconnectingPlayers` com contagem regressiva e alerta de jogador sozinho.
  - `QuizModal`: cartões táteis `[A/B/C/D]`, atalhos de teclado (`A–D`, `Enter`, `Esc`), pulso de urgência nos 5s finais e banner de Avanço por Equidade (`+1 casa`).
  - `GameOverModal`: pódio duplo (Corrida + Destaque do Quiz), confete celebratório, estado digno para encerramento por abandono (`reason === "abandoned"`), revelação de papéis (incluindo quem saiu) e revanche instantânea com rotação de papéis.
- `src/components/profile/ProfileView.tsx`: preferências da conta, consentimento LGPD, coleção **Perspectivas Vivenciadas (4/4)** e histórico pessoal.
- `src/components/teacher/` (`TeacherPanelView`, `AnalyticsCharts`): gráficos comparativos de equidade (com linhas de referência `25%` e `E[X]=3,50`), **Heatmap 4×4** (Empírico / Teórico N1–N3), barras de distratores A/B/C/D por questão, CRUD/curadoria de perguntas, turmas, exportação CSV/JSON anonimizada e gestão de papéis.
- `src/components/ui/` (`DuoComponents`, `RoomQrCode`, `HowToPlayModal`) e `src/utils/` (`qrMatrix.ts`, `soundEffects.ts`): design system tátil **Duo-Equidade** (sem `shadow*`), gerador QR ISO/IEC 18004 puro em TypeScript e sintetizador de efeitos sonoros via Web Audio API.

---

## 3. Arquitetura do Backend (`backend/`)

Stack: **Node.js (CommonJS)**, **Express 5**, **Socket.IO 4**, **mysql2/promise**, `cors`, `dotenv` (zero dependências externas extras para JWT/OAuth — verificação criptográfica nativa via `node:crypto` + `fetch`).

| Módulo | Responsabilidade |
| --- | --- |
| `server.js` | Bootstrap, normalização/validação estrita de `CLIENT_ORIGIN` em produção (removendo `/` final), HTTP + Socket.IO com auth JWT opcional no handshake e shutdown gracioso (`SIGTERM`/`SIGINT`). |
| `api.js` | Rotas REST v2.0 com CORS explícito (`Authorization`, `X-Question-Admin-Token`), cabeçalhos defensivos e `/api/status` expondo `googleAuthEnabled` + `googleClientId` público. |
| `config/db.js` | Pool `mysql2/promise` com validação de porta e TLS obrigatório (`rejectUnauthorized: true`) quando `DB_SSL=true`. |
| `lobby.js` | Salas públicas/privadas, rate limits, reconexão de 60s com `reconnectingPlayers` + `reconnectDeadlineAt`, finalização imediata de quiz se o último sem resposta desconectar, encerramento automático por abandono (`abandoned`) se restar 1 jogador, revanche com rotação de papéis (derangement) e disparo assíncrono de persistência. |
| `gameEngine.js` | Motor puro (`0..30`, dado 1–6, Impulso `+2`, obstáculos, Avanço por Equidade `+1`, 6/8 rodadas, desempate, `finishByAbandonment`, `lastEvent`, `turnHistory` e estatísticas privadas). |
| `quizService.js` | Derivação de nível estrutural pela matriz e sorteio sem repetição por rodada/partida. |
| `utils/logger.js` | Logger estruturado (JSON em produção) com sanitização recursiva de segredos e PII. |
| `services/authService.js` | Verificação RS256 de Google ID Token via JWKS oficial com cache + rotação de chaves e JWT `HS256` da aplicação. |
| `middleware/authMiddleware.js` | `attachAuth`, `requireAuth`, `requireRole` e `requireQuestionManager` (JWT `professor`/`admin` ou `X-Question-Admin-Token` em tempo constante). |
| `repositories/userRepository.js` | Upsert Google (com `BOOTSTRAP_ADMIN_EMAIL`), preferências/LGPD, listagem paginada compatível com MySQL 8.4 e gestão de papéis. |
| `repositories/classRepository.js` | CRUD de `turmas` por professor e validação de código de turma ao criar/configurar sala. |
| `repositories/questionRepository.js` | Consulta governada (`ativa = 1 AND status_revisao = 'aprovada'`) com fallback automático v1 (`ER_BAD_FIELD_ERROR`), CRUD docente completo e detecção de duplicatas (`409`). |
| `repositories/matchRepository.js` | Persistência transacional (`BEGIN ... COMMIT`/`ROLLBACK`) nas 5 tabelas de partida/quiz e histórico pessoal compatível com MySQL 8.4. |
| `repositories/analyticsRepository.js` | Consultas parametrizadas sobre as 5 views analíticas e exportação CSV (com proteção contra formula injection) e JSON. |
| `services/matchPersistenceService.js` | Persistência assíncrona resiliente pós-partida com degradação segura sem jamais interromper o `game_over`. |

---

## 4. Fluxo de Autenticação (Google OAuth + Convidado)

```text
1. Frontend consulta GET /api/status (recebe googleAuthEnabled + googleClientId público)
2. Usuário clica "Continuar com o Google" no botão oficial GIS (Web)
3. Google retorna `credential` (ID Token RS256 assinado) ao cliente
4. Frontend envia POST /api/auth/google { idToken }
5. Backend valida assinatura RS256 via JWKS Google, iss, aud === GOOGLE_CLIENT_ID e email_verified
6. Backend faz upsert em `usuarios` (promovendo BOOTSTRAP_ADMIN_EMAIL a admin) e emite JWT HS256
7. Frontend usa o JWT em:
   - Header HTTP: `Authorization: Bearer <jwt>`
   - Handshake Socket.IO: `io(SERVER_URL, { auth: { token: jwt } })`
8. Convidados pulam os passos 2–6 e jogam imediatamente com `sessionToken` temporário.
```

---

## 5. Contrato Formal de API REST

### 5.1 Saúde e Operação
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `GET /api/status` | Pública | ✅ Ativo | Verifica `SELECT 1` no MySQL; retorna `{ ok, db, googleAuthEnabled, googleClientId? }` ou `503` em falha/shutdown. |

### 5.2 Autenticação e Perfil Pessoal
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `POST /api/auth/google` | Pública | ✅ Ativo | Valida Google `idToken`, faz upsert em `usuarios` e retorna `{ token, user }`. |
| `GET /api/auth/me` | JWT | ✅ Ativo | Retorna perfil, papel (`jogador`/`professor`/`admin`) e consentimento LGPD. |
| `PATCH /api/auth/me` | JWT | ✅ Ativo | Atualiza `apelidoPadrao`, `avatarPadrao` e `consentimentoPesquisa`. |
| `GET /api/me/partidas` | JWT | ✅ Ativo | Histórico paginado das partidas concluídas do usuário + `perspectivasVivenciadas`. |

### 5.3 Banco de Perguntas (Público / Docente)
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `GET /api/perguntas` | Pública (sem gabarito) / Docente (`?includeAnswer=true`) | ✅ Ativo | Lista perguntas com filtros (`etapa`, `nivel`, `area`, `status`, `ativa`, `q`). |
| `POST /api/perguntas` | `professor`/`admin` ou `X-Question-Admin-Token` | ✅ Ativo | Cadastra nova questão; retorna `409` se `enunciado_hash` já existir. |
| `PUT /api/perguntas/:id` | `professor`/`admin` ou `X-Question-Admin-Token` | ✅ Ativo | Edita questão completa. |
| `PATCH /api/perguntas/:id/status` | `professor`/`admin` ou `X-Question-Admin-Token` | ✅ Ativo | Atualiza `status_revisao` (`rascunho`/`em_revisao`/`aprovada`/`arquivada`) e `ativa`. |

### 5.4 Turmas, Analytics e Administração
| Método & Rota | Auth | Status | Descrição |
| --- | --- | --- | --- |
| `GET /api/turmas` | `professor`/`admin` | ✅ Ativo | Lista turmas do professor (ou todas para `admin`) com contagem de partidas. |
| `POST /api/turmas` | `professor`/`admin` | ✅ Ativo | Cria turma com código único (ex.: `MAT101-2026A`) e etapa padrão. |
| `PATCH /api/turmas/:id` | `professor`/`admin` | ✅ Ativo | Edita nome, instituição, etapa padrão ou status `ativa`. |
| `GET /api/analytics/overview` | `professor`/`admin` ou Admin Token | ✅ Ativo | KPIs gerais e distribuição por etapa (`etapa`, `turma`, `matriz`). |
| `GET /api/analytics/perguntas` | `professor`/`admin` ou Admin Token | ✅ Ativo | Consulta `vw_desempenho_perguntas` (facilidade `p`, tempo médio, distratores A/B/C/D). |
| `GET /api/analytics/equidade` | `professor`/`admin` ou Admin Token | ✅ Ativo | Consulta `vw_equidade_por_condicao` e `vw_matriz_empirica`. |
| `GET /api/analytics/export` | `professor`/`admin` ou Admin Token | ✅ Ativo | Exporta dataset anonimizado (`dataset=participacoes|respostas`, `format=csv|json`, somente `consentiu_pesquisa = 1`). |
| `GET /api/admin/usuarios` | `admin` | ✅ Ativo | Lista usuários cadastrados para gestão de papéis. |
| `PATCH /api/admin/usuarios/:id/papel` | `admin` | ✅ Ativo | Promove/altera `papel_sistema` (`jogador` / `professor` / `admin`). |

---

## 6. Contrato Formal de Eventos Socket.IO

### 6.1 Cliente → Servidor
| Evento | Payload principal | Rate limit (/min) |
| --- | --- | :---: |
| `create_room` | `{ name, avatarId, isPrivate, sessionToken?, quizDurationSec?, maxRounds?, turmaCodigo?, consentResearch? }` | 5 |
| `list_rooms` | *(nenhum)* | 30 |
| `join_room` | `{ roomCode, name, avatarId, sessionToken?, consentResearch? }` | 30 |
| `resume_room` | `{ roomCode, sessionToken }` | 10 |
| `set_school_stage` | `{ roomCode, schoolStage }` | 20 |
| `update_room_settings` | `{ roomCode, quizDurationSec?, maxRounds?, turmaCodigo? }` | 20 |
| `start_game` | `{ roomCode }` | 10 |
| `roll_dice` | `{ roomCode }` | 20 |
| `submit_quiz_answer` | `{ quizId, alternativa }` + callback ack `{ success, code? }` | 30 |
| `play_again` | `{ roomCode }` | 10 |
| `leave_room` | *(nenhum)* | — |
| `close_room` | `{ roomCode }` | — |

### 6.2 Servidor → Cliente
| Evento | Destino | Payload resumido |
| --- | --- | --- |
| `rooms_updated` | Global / socket | `{ rooms: PublicRoomSummary[] }` |
| `room_created` / `room_joined` / `room_resumed` | Socket | Dados da sala, `sessionToken`, `players`, configurações e `condition` (no resume) |
| `room_updated` | Sala | `roomCode`, `hostId`, `isPrivate`, `schoolStage`, `quizDurationSec`, `maxRounds`, `turmaCodigo`, `started`, `players`, `reconnectingPlayers` (`reconnectDeadlineAt`) |
| `room_left` / `room_closed` / `room_error` | Socket | Feedback explícito de saída, encerramento ou erro |
| `game_started` | Socket individual | `{ condition }` (privado) |
| `game_state_updated` | Sala | `{ positions, quizPoints, currentPlayerId, round, maxRounds, diceResult, status, lastEvent }` |
| `obstacle_pending` | Sala | `{ playerId, position, round }` |
| `quiz_question` | Socket individual | `{ quizId, enunciado, alternativas: { A, B, C, D }, deadlineAt, durationSec }` |
| `quiz_result` | Socket individual | `{ quizId, alternativa, correta, pontos, bonusMove, tempoRespostaMs?, respostaCorreta, explicacao? }` |
| `quiz_error` | Sala | `{ quizId, code }` |
| `quiz_round_ended` | Sala | `{ quizId, placar, motivo, fastestCorrectPlayerId }` |
| `game_over` | Sala | `{ winners, quizHighlights, reason: "finish" | "round_limit" | "abandoned", roles, reveal }` |

---

## 7. Deploy, Variáveis de Ambiente e Operação

### Render (Backend)
- **Root Directory:** `backend` · **Build:** `npm ci` · **Start:** `npm start` · **Health Check:** `/api/status`
- **Variáveis obrigatórias:** `PORT`, `NODE_ENV=production`, `CLIENT_ORIGIN` (ex.: `https://jogoinclusaoufrrj.vercel.app`), `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, `DB_CA_CERT`, `QUESTION_ADMIN_TOKEN`.
- **Variáveis Google OAuth / RBAC:** `GOOGLE_CLIENT_ID`, `JWT_SECRET` (mín. 16 caracteres; recomendado 32+ bytes), `BOOTSTRAP_ADMIN_EMAIL`.

### Vercel (Frontend Web)
- **Root Directory:** `frontend` · **Build:** `npm run build:web` · **Output:** `dist`
- **Variáveis:** `EXPO_PUBLIC_SERVER_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

### Limitações Conhecidas e Evolução
- **Single-instance em memória:** reinício ou novo deploy no Render encerra partidas em andamento (partidas concluídas permanecem salvas no MySQL). Escala horizontal futura exigirá Redis + `@socket.io/redis-adapter`.
- **Banco de dados:** o Aiven MySQL Free Tier atual permanece ativo durante a fase de apresentação (encerramento previsto em **2026-12-21**). Como o schema usa SQL padrão MySQL 8, a migração futura para outro provedor será direta via backup/restore.
- **Privilégios mínimos e logs:** nunca registrar tokens, senhas ou PII em logs; criar usuário MySQL dedicado sem privilégios administrativos quando migrar para infraestrutura permanente.
