# Roadmap — Ludo Equidade

- **Atualizado em:** 2026-11-22

Este roadmap organiza a evolução do **Ludo Equidade** desde o MVP web v1.0 até a versão institucional **v2.1** voltada à apresentação no **ICE — Departamento de Matemática da UFRRJ**, ao **Painel de Professores** e à geração de **dados estratégicos anonimizados** para pesquisa em Estatística, Probabilidade e Inferência.

---

## Fase 0 — MVP Web v1.0 Publicado
**Status: ✅ Concluída**

- [x] Frontend Expo publicado na Vercel (`https://jogoinclusaoufrrj.vercel.app/`), Backend no Render e MySQL (`defaultdb` no Aiven) com 27 perguntas únicas balanceadas.

---

## Fase 1 — Fundação v2.0: GDD, Banco Analítico e Arquitetura
**Status: ✅ Concluída e aplicada em produção**

- [x] GDD v2.0 ([GDD.md](./GDD.md)), UML ([DATABASE_UML.md](./DATABASE_UML.md)) e Arquitetura ([ARQUITETURA_E_OPERACAO.md](./ARQUITETURA_E_OPERACAO.md)).
- [x] Migrações SQL `001`, `002` e `003` (9 tabelas normalizadas + 5 views analíticas LGPD) aplicadas em produção no MySQL (`defaultdb`).

---

## Fase 2 — Backend v2.0, OAuth, Persistência e Resiliência
**Status: ✅ Concluída e validada (93/93 testes)**

- [x] Gameplay v2.0: Avanço por Equidade (`+1` casa), duplo pódio, tempo configurável (`30/45/60s`), `6/8` rodadas, vínculo de turma, `lastEvent`, `tempoRespostaMs` e revanche `play_again` com rotação de papéis (derangement).
- [x] Google OAuth 2.0 (RS256/JWKS) + JWT (HS256) + RBAC (`jogador`/`professor`/`admin`) + fallback `X-Question-Admin-Token` — validado em produção no Render.
- [x] Persistência transacional pós-partida, histórico pessoal (MySQL 8.4-safe), CRUD docente, turmas, analytics e exportação CSV/JSON anonimizada.
- [x] Resiliência a quedas e abandono: `reconnectingPlayers` com `reconnectDeadlineAt`, encerramento imediato de quiz se o último sem resposta desconectar, encerramento automático (`reason: "abandoned"`) quando resta 1 jogador e CORS normalizado.

---

## Fase 3 — Frontend Profissional v2.1: UX/UI, Gráficos, QR Code, Animações e WCAG
**Status: ✅ Concluída e validada (`tsc`, `lint`, `build:web`)**

- [x] Redesign UX/UI institucional (ICE • UFRRJ) responsivo em 2 colunas, páginas legais estáticas (`/privacidade` LGPD e `/termos`), modo claro/escuro/daltônico e zero `shadow*`.
- [x] **Sala de Aula:** convite por link direto (`?sala=XXXX`), **QR Code ISO/IEC 18004 nativo**, barra de prontidão e Guia Rápido (`❓ Regras`).
- [x] **Partida animada & polida:** dado geométrico 3×3 com tumble/mola/pulso, tabuleiro panorâmico (`0..30` + 5 colunas no desktop), peões animados (`ZoomIn`), cartões táteis `[A/B/C/D]` com atalhos de teclado, efeitos sonoros sintetizados (`🔊/🔇`), botão `🙈 Ocultar` papel secreto e botão `🚪 Sair` com confirmação.
- [x] **Resiliência na Web:** retomada automática via `sessionStorage` após F5/recarregamento, contagem regressiva visual para jogadores reconectando e tela limpa para encerramento por abandono.
- [x] **Painel Docente com Gráficos & Heatmap:** gráfico comparativo por condição (linhas de referência `25%` e `E[X] = 3,50`), Heatmap 4×4 (Empírico / Teórico N1–N3), distribuição por etapa, barras de distratores A/B/C/D e exportação CSV/JSON com 1 clique.

---

## Fase 4 — Expansão Pedagógica do Acervo & Kit Científico (Próximo Passo)
**Prioridade: alta**

- [ ] Criar migration `004_expansao_banco_questoes.sql` expandindo o acervo de **27** para **81–90 perguntas únicas balanceadas** (9–10 por combinação `etapa × nível`), com `area_tematica`, BNCC e revisão junto aos docentes do Departamento de Matemática (ICE-UFRRJ) e pessoas com deficiência.
- [ ] Disponibilizar script/notebook de exemplo em **Python e/ou R** pronto para analisar o CSV anonimizado exportado do Painel Docente (Qui-Quadrado, ANOVA, índice de facilidade `p` e comparação com `E[X] = 3,5`).
- [ ] Atualizar links de Privacidade (`/privacidade`) e Termos (`/termos`) no Google Cloud Branding e validar fluxo v2.1 completo em desktop, Safari iPhone e Android.

---

## Fase 5 — Operação Contínua e Escala Futura
**Prioridade: média**

- [ ] Migrar hospedagem MySQL antes do encerramento do **Aiven Free Tier (2026-12-21)** utilizando backup lógico e os scripts portáveis de `database/migrations/`.
- [ ] Configurar usuário MySQL dedicado de privilégios mínimos e monitoramento contínuo de `/api/status`.
- [ ] Avaliar Redis + `@socket.io/redis-adapter` caso o volume simultâneo de turmas demande múltiplas instâncias no backend.
- [ ] Submissão de protocolo ético (CEP) caso o projeto avance formalmente como pesquisa de Iniciação Científica com coleta em escolas públicas.
