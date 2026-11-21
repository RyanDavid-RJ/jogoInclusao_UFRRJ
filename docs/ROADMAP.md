# Roadmap — Ludo Equidade

- **Atualizado em:** 2026-11-21

Este roadmap organiza a evolução do **Ludo Equidade** desde o MVP web já publicado (v1.0) até a versão institucional **v2.0** voltada à apresentação no **ICE — Departamento de Matemática da UFRRJ**, ao **Painel de Professores** e à geração de **dados estratégicos anonimizados** para pesquisa em Estatística, Probabilidade e Inferência.

---

## Fase 0 — MVP Web v1.0 Publicado
**Status: ✅ Concluída**

- [x] Frontend Expo publicado na Vercel (`https://jogoinclusaoufrrj.vercel.app/`).
- [x] Backend Node.js / Express / Socket.IO publicado no Render com `NODE_ENV=production`, `CLIENT_ORIGIN` restrito e `QUESTION_ADMIN_TOKEN`.
- [x] Banco MySQL (`defaultdb` no Aiven) populado com **27 perguntas únicas balanceadas** (3 por combinação `etapa × nível`).
- [x] Lobby completo (4–8 jogadores, salas públicas/privadas, código de 4 caracteres, cópia rápida, fechamento pelo anfitrião, expiração ociosa de 30 min).
- [x] Motor autoritativo (trilha `0..30`, dado 1–6, Impulso `+2`, obstáculos `7/14/21/28`, quiz simultâneo 30s sem repetição na partida, reconexão de 60s inclusive durante quiz ativo).
- [x] Revelação pós-jogo (`GameOverModal`) com papéis privados, métricas observadas e perguntas de reflexão.
- [x] Tema claro/escuro com contraste ajustado, modo daltônico, redução de movimento (`useReducedMotion`) e rolagem mobile validada no Safari (iPhone físico).
- [x] 76/76 testes backend, `npx tsc --noEmit` e `npm run lint` aprovados.

---

## Fase 1 — Fundação v2.0: GDD, Modelagem de Dados e Arquitetura (Etapas 1–3)
**Status: ✅ Especificação e scripts SQL prontos (2026-11-21)**

- [x] Consolidar **GDD v2.0** ([GDD.md](./GDD.md)) com foco em rejogabilidade (Avanço por Equidade, duplo pódio, revanche instantânea com rotação de papéis, tempo configurável `30/45/60s`, feed de turno), contas Google + Convidado, Painel de Professores e vocação científica (ICE-UFRRJ).
- [x] Projetar e versionar o **schema relacional v2.0** em `database/migrations/` (9 tabelas normalizadas + `schema_migrations` + 5 views analíticas e datasets anonimizados LGPD).
- [x] Atualizar [DATABASE_UML.md](./DATABASE_UML.md) com ERD, componentes, sequência e dicionário estatístico (TCT/TRI/Markov/Inferência).
- [x] Formalizar **Arquitetura e Contratos REST + Socket.IO v2.0** em [ARQUITETURA_E_OPERACAO.md](./ARQUITETURA_E_OPERACAO.md).
- [ ] Aplicar `migrations/001`, `002` e `003` no banco ativo (`defaultdb`) e validar com as consultas de conferência em [database/README.md](../database/README.md).

---

## Fase 2 — Implementação de Backend, Regras v2.0, Persistência e Testes (Etapa 4)
**Prioridade: alta (próxima entrega de código)**

### Lote 4A — Gameplay v2.0 e Observabilidade
- [ ] Adicionar logger estruturado (`utils/logger.js`) separando eventos operacionais de eventos de partida (sem PII/segredos).
- [ ] Evoluir `gameEngine.js` e `lobby.js`:
  - **Avanço por Equidade:** `+1` casa para o 1º acerto no quiz (limitado à casa 30, sem reativar obstáculo).
  - **Duplo reconhecimento no pódio:** `winners` + `quizHighlights` no `game_over`.
  - **Configurações da sala:** `quizDurationSec` (`30/45/60`), `maxRounds` (`6/8`) e `turmaCodigo` opcional.
  - **Revanche instantânea (`play_again`):** reiniciar partida na mesma sala com rotação preferencial de papéis.
  - **Feed de eventos de turno (`lastEvent`)** e medição de `tempo_resposta_ms` no servidor.
  - Manter `questionRepository` compatível com `ativa = 1 AND status_revisao = 'aprovada'` (com fallback seguro se a migration 002 ainda não estiver aplicada em ambiente de teste).

### Lote 4B — Autenticação Google OAuth, RBAC e Histórico
- [ ] Implementar `authService.js`, `authMiddleware.js` e `userRepository.js` (`POST /api/auth/google`, `GET/PATCH /api/auth/me`, gestão de `consentimento_pesquisa` e papel `jogador`/`professor`/`admin`).
- [ ] Aceitar JWT opcional no handshake Socket.IO (mantendo 100% de compatibilidade com Convidados sem login).
- [ ] Implementar `matchRepository.js` e `matchPersistenceService.js` para gravação transacional pós-partida (`partidas`, `partida_participantes`, `partida_turnos`, `quiz_rodadas`, `quiz_respostas`) e `GET /api/me/partidas`.

### Lote 4C — Painel de Professores, Turmas e Exportação Científica
- [ ] Expandir CRUD docente de perguntas (`GET/POST/PUT/PATCH /api/perguntas`) com fluxo editorial (`rascunho`/`em_revisao`/`aprovada`/`arquivada`), `area_tematica` e tratamento de duplicatas (`409`).
- [ ] Implementar `classRepository.js` (`/api/turmas`) e `analyticsRepository.js` (`/api/analytics/overview`, `/perguntas`, `/equidade`, `/export?format=csv|json` 100% anonimizado).
- [ ] Implementar endpoints administrativos (`/api/admin/usuarios`) e cobertura completa na suíte automatizada (`npm test`).

---

## Fase 3 — Expansão e Revisão Pedagógica do Acervo de Perguntas
**Prioridade: alta (após estrutura do banco e backend firmes)**

- [ ] Expandir o acervo de **27** para **54–90 perguntas únicas balanceadas** (6 a 10 por combinação `etapa × nível`), preenchendo `area_tematica` e revisando gabaritos/explicações.
- [ ] Revisar questões e a Matriz de Equidade com professores do Departamento de Matemática (ICE-UFRRJ), educadores e pessoas com deficiência.

---

## Fase 4 — Frontend Impecável: UX/UI Profissional, Painel Docente e WCAG (Etapa 5)
**Prioridade: alta (após Backend v2.0 estável)**

- [ ] **Redesign UX/UI profissional:** elevar identidade visual, hierarquia tipográfica, tabuleiro interativo com feed de eventos do turno, destaques do jogador ativo e ícones/ilustrações vetoriais consistentes (sem `shadow*` no RN Web).
- [ ] **Fluxo de Contas + Perfil:** login com Google + botão "Jogar como Convidado", toggle claro de consentimento de pesquisa, tela de histórico pessoal e progresso de perspectivas (`4/4`).
- [ ] **Experiência de Sala e Revanche:** seletor de tempo do quiz (`30/45/60s`), duração (`6/8` rodadas), vínculo de turma e botão **"Jogar Novamente"** no `GameOverModal`.
- [ ] **Painel de Professores na interface:** gestão de questões, visão de métricas empíricas por questão/condição/matriz e download com 1 clique de datasets anonimizados (CSV/JSON).
- [ ] **Acessibilidade WCAG 2.1 AA:** navegação completa por teclado na Web (`A/B/C/D`, `Enter`, `Esc`, foco visível, focus trap em modais), revisão de leitor de tela e validação de contraste em claro/escuro/daltônico.
- [ ] **Validação multiplataforma:** desktop, Safari iPhone, navegador Android e Expo Go nativo.

---

## Fase 5 — Operação Contínua e Escala Futura
**Prioridade: média (quando a demanda institucional crescer)**

- [ ] Migrar hospedagem MySQL antes do encerramento do **Aiven Free Tier (2026-12-21)** utilizando backup lógico e os scripts portáveis de `database/migrations/`.
- [ ] Configurar usuário MySQL dedicado de privilégios mínimos e monitoramento contínuo de `/api/status`.
- [ ] Avaliar Redis + `@socket.io/redis-adapter` caso o volume simultâneo de turmas demande múltiplas instâncias no backend.
- [ ] Submissão de protocolo ético (CEP) caso o projeto avance formalmente como pesquisa de Iniciação Científica com coleta em escolas públicas.
