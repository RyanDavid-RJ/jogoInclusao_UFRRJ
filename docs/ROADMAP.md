# Roadmap — Ludo Equidade

- **Atualizado em:** 2026-11-21

Este roadmap organiza a evolução do **Ludo Equidade** desde o MVP web v1.0 até a versão institucional **v2.0** voltada à apresentação no **ICE — Departamento de Matemática da UFRRJ**, ao **Painel de Professores** e à geração de **dados estratégicos anonimizados** para pesquisa em Estatística, Probabilidade e Inferência.

---

## Fase 0 — MVP Web v1.0 Publicado
**Status: ✅ Concluída**

- [x] Frontend Expo publicado na Vercel (`https://jogoinclusaoufrrj.vercel.app/`).
- [x] Backend Node.js / Express / Socket.IO publicado no Render com `NODE_ENV=production`, `CLIENT_ORIGIN` restrito e `QUESTION_ADMIN_TOKEN`.
- [x] Banco MySQL (`defaultdb` no Aiven) populado com **27 perguntas únicas balanceadas** (3 por combinação `etapa × nível`).
- [x] Lobby completo, motor autoritativo (`0..30`, Impulso `+2`, obstáculos `7/14/21/28`, quiz simultâneo sem repetição, reconexão 60s), `GameOverModal` com métricas observadas e temas claro/escuro/daltônico.

---

## Fase 1 — Fundação v2.0: GDD, Modelagem de Dados e Arquitetura (Etapas 1–3)
**Status: ✅ Concluída (2026-11-21)**

- [x] Consolidar **GDD v2.0** ([GDD.md](./GDD.md)) com foco em engajamento, rejogabilidade e vocação científica ICE-UFRRJ.
- [x] Projetar e versionar o **schema relacional v2.0** em `database/migrations/` (9 tabelas normalizadas + `schema_migrations` + 5 views analíticas e datasets anonimizados LGPD).
- [x] Atualizar [DATABASE_UML.md](./DATABASE_UML.md) com ERD, componentes, sequência e dicionário estatístico (TCT/TRI/Markov/Inferência).
- [x] Formalizar **Arquitetura e Contratos REST + Socket.IO v2.0** em [ARQUITETURA_E_OPERACAO.md](./ARQUITETURA_E_OPERACAO.md).

---

## Fase 2 — Backend v2.0, Persistência Analítica, OAuth e Testes (Etapa 4)
**Status: ✅ Concluída e validada com 88/88 testes (2026-11-21)**

- [x] Logger estruturado (`backend/utils/logger.js`) com sanitização recursiva de segredos e PII.
- [x] Gameplay v2.0 em `gameEngine.js` e `lobby.js`: Avanço por Equidade (`+1` casa para 1º acerto), duplo pódio (`winners` + `quizHighlights`), tempo de quiz (`30/45/60s`), limite de rodadas (`6/8`), vínculo de turma, feed narrativo (`lastEvent`), `tempoRespostaMs` e revanche instantânea (`play_again`) com rotação de papéis (derangement).
- [x] Autenticação Google OIDC (RS256/JWKS) + JWT (HS256) sem dependências extras (`authService.js`, `authMiddleware.js`, `userRepository.js`), mantendo 100% de compatibilidade com Convidados e `X-Question-Admin-Token`.
- [x] Persistência transacional pós-partida (`matchRepository.js`, `matchPersistenceService.js`) com degradação segura antes das migrações e histórico pessoal (`GET /api/me/partidas`).
- [x] CRUD docente de perguntas com governança editorial e fallback v1/v2 (`questionRepository.js`), gestão de turmas (`classRepository.js`), indicadores/exportação anonimizada CSV+JSON (`analyticsRepository.js`) e gestão administrativa de papéis (`/api/admin/usuarios`).
- [x] Suíte automatizada expandida para **88 testes** (`node --test`), 100% aprovados.

---

## Fase 3 — Frontend Profissional v2.0: UX/UI, Perfil, Painel Docente e WCAG (Etapa 5)
**Status: ✅ Concluída e validada com TypeScript, ESLint e build Web (2026-11-21)**

- [x] **Redesign UX/UI institucional (ICE • UFRRJ):** layout responsivo em duas colunas na Home, cabeçalho com navegação por abas (`Jogar`, `Perfil`, `Painel Docente`), paleta de alto contraste (claro/escuro/daltônico) e zero `shadow*`.
- [x] **Contas & LGPD:** `GoogleSignInButton` (Web GIS) + Modo Convidado sem atrito, consentimento explícito de pesquisa (opt-in) e `ProfileView` com preferências, histórico e coleção `Perspectivas Vivenciadas (4/4)`.
- [x] **Sala e Partida v2.0:** configurações do anfitrião (`30/45/60s`, `6/8` rodadas, código da turma), feed vivo de eventos no `DicePanel`, legenda e destaque do jogador ativo no `BoardTrack` e `PlayersSidebar`, feedback `+1 casa` no `QuizModal` e pódio duplo + botão **Jogar Novamente** no `GameOverModal`.
- [x] **Painel de Professores & Pesquisa (`TeacherPanelView`):** acesso por conta Google docente ou token administrativo, indicadores empíricos por condição e matriz, download com 1 clique de datasets anonimizados (CSV/JSON), CRUD completo de questões com estatísticas de distratores, gestão de turmas e administração de papéis.
- [x] **Acessibilidade WCAG 2.1 AA:** foco visível (`:focus-visible`), atalhos de teclado no quiz (`A–D`, `Enter`, `Esc`), `accessibilityLiveRegion` e respeito a `useReducedMotion`.

---

## Fase 4 — Publicação v2.0 e Expansão Pedagógica do Acervo
**Prioridade: alta (próximos passos de operação e conteúdo)**

- [ ] Aplicar `database/migrations/001`, `002` e `003` no banco ativo (`defaultdb`) via MySQL Workbench ([database/README.md](../database/README.md)).
- [ ] Publicar v2.0 no Render e na Vercel (e configurar `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `BOOTSTRAP_ADMIN_EMAIL` e `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` quando ativar o login Google).
- [ ] Expandir o acervo de **27** para **54–90 perguntas únicas balanceadas** (6 a 10 por combinação `etapa × nível`), preenchendo `area_tematica` e revisando gabaritos/explicações com professores do Departamento de Matemática (ICE-UFRRJ) e pessoas com deficiência.
- [ ] Validar fluxo v2.0 multiplataforma após deploy (desktop, Safari iPhone, navegador Android e Expo Go nativo).

---

## Fase 5 — Operação Contínua e Escala Futura
**Prioridade: média**

- [ ] Migrar hospedagem MySQL antes do encerramento do **Aiven Free Tier (2026-12-21)** utilizando backup lógico e os scripts portáveis de `database/migrations/`.
- [ ] Configurar usuário MySQL dedicado de privilégios mínimos e monitoramento contínuo de `/api/status`.
- [ ] Avaliar Redis + `@socket.io/redis-adapter` caso o volume simultâneo de turmas demande múltiplas instâncias no backend.
- [ ] Submissão de protocolo ético (CEP) caso o projeto avance formalmente como pesquisa de Iniciação Científica com coleta em escolas públicas.
