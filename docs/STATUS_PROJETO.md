# Status do Projeto — Ludo Equidade

- **Atualizado em:** 2026-11-22
- **Estado:** Versão institucional **v2.1** em produção (Render + Vercel + MySQL 8 no Aiven migrado + Google OAuth ativo), com Polimento UX/UI Profissional, Gráficos & Heatmap no Painel Docente, QR Code de sala e Resiliência completa contra quedas de conexão e abandono — **93/93 testes** aprovados.

## 1. Visão e Contexto Atual

O **Ludo Equidade** é um jogo de tabuleiro educativo multiplayer sobre matemática,
inclusão e acessibilidade, desenvolvido para apresentação institucional ao
**Departamento de Matemática do Instituto de Ciências Exatas (ICE — UFRRJ)**
como produto educacional e potencial projeto de **Iniciação Científica (IC)**.

A proposta alia ensino ativo de matemática e debate sobre equidade a uma
arquitetura de dados projetada para estudos de **Estatística, Probabilidade,
Processos Estocásticos e Inferência**, preservando rigor ético (LGPD,
pseudonimização e consentimento explícito) e sem afirmar que papéis de jogo
representam a experiência universal de pessoas reais.

## 2. O que já está em produção e validado

### Infraestrutura, Banco e Autenticação
- **Frontend publicado na Vercel:** <https://jogoinclusaoufrrj.vercel.app/> (com páginas estáticas `/`, `/privacidade` e `/termos`).
- **Backend publicado no Render:** <https://jogoinclusao-ufrrj.onrender.com/api/status> (`ok: true`, `db: "ok"`, `googleAuthEnabled: true`).
- **MySQL 8 (Aiven `defaultdb`):** migrações `001`, `002` e `003` aplicadas (9 tabelas normalizadas + 5 views analíticas anonimizadas + 27 perguntas únicas balanceadas).
- **Google OAuth 2.0 (RS256 via JWKS) + JWT HS256 + Modo Convidado:** funcional em produção (app publicado como Externo / Em Produção), recuperação automática após *cold start* do Render e compatibilidade com `X-Question-Admin-Token`.

### Gameplay, UX/UI Profissional e Sala de Aula
- **Sala de Espera de Sala de Aula:** código de 4 caracteres, cópia de link direto (`?sala=XXXX`), **QR Code ISO/IEC 18004 nativo** para projeção/celular, barra de prontidão (`X/4 mínimo · até 8`), banner de convite automático na Home e configurações de etapa, tempo de quiz (`30/45/60s`), rodadas (`6/8`) e código de turma.
- **Tabuleiro e Animações:** mini-trilha panorâmica `0 ─── 30`, grade sinuosa responsiva (**5 colunas** em desktop largo / **3 colunas** no mobile), **dado geométrico 3×3 animado** (ciclo de faces, rotação/mola e pulso na sua vez), peões com animação de pouso (`ZoomIn`), callout flutuante da jogada (`🚀 +2!`, `⚡ +1 QUIZ`, `🚧 QUIZ!`) e feed narrativo ao vivo (`lastEvent`).
- **Quiz e Acessibilidade (WCAG 2.1 AA):** cartões táteis `[A/B/C/D]` alinhados à esquerda, atalhos de teclado (`A–D`, `Enter`, `Esc`), pulso de urgência nos 5s finais, Avanço por Equidade (`+1` casa para o 1º acerto), tema claro/escuro, modo daltônico, foco visível (`:focus-visible`), efeitos sonoros sintetizados com mudo (`🔊/🔇`), botão `🙈 Ocultar` papel secreto e Guia Rápido (`❓ Regras`).
- **Pódio Duplo e Revanche:** celebração de **Vencedor da Corrida** + **Destaque do Quiz** com confete sutil, barra visual de progresso por jogador, métricas observadas e botão **Jogar Novamente** com rotação automática de papéis.

### Resiliência a Quedas de Internet e Jogador Sozinho
- **Retomada automática após F5 / recarregamento mobile:** sessão ativa (`roomCode`, `sessionToken`) persistida em `sessionStorage` na Web, reconectando automaticamente inclusive durante quiz ativo.
- **Estado visível de `📡 Reconectando (Xs)`:** jogadores cuja internet oscilou não somem mais nem deixam `"⏳ Turno de "` em branco — `DicePanel` e `PlayersSidebar` exibem o nome e a contagem regressiva de retorno.
- **Quiz sem travamento:** se o último jogador que faltava responder desconectar, a rodada do quiz encerra imediatamente para os demais.
- **Encerramento limpo quando sobra 1 jogador:** se os demais saírem ou expirarem, a partida encerra automaticamente com `reason: "abandoned"` (excluída das métricas científicas de partidas concluídas, mas revelando os papéis para quem ficou), além do botão **`🚪 Sair`** com confirmação acessível a qualquer momento no topo da partida.

### Painel de Professores & Pesquisa (ICE — UFRRJ)
- **Visualizações Estatísticas:** gráfico comparativo de equidade por perspectiva (Vitória com linha `25%`, Posição Média, Acerto no Quiz e Média do Dado com linha teórica `E[X] = 3,50`), **Heatmap Visual 4×4** (Obstáculo × Condição em modo Empírico ou Teórico N1–N3), distribuição por etapa e mini-barras de distratores A/B/C/D em cada pergunta.
- **Gestão e Exportação Científica:** CRUD completo de perguntas com curadoria editorial, gestão de turmas pedagógicas, administração de papéis (`jogador`/`professor`/`admin`) e download com 1 clique de datasets 100% anonimizados em **CSV / JSON** (LGPD opt-in).

## 3. Evidências de validação

Em **2026-11-22**, toda a suíte automatizada foi aprovada com código `0`:

- **Backend (`npm test`):** **93/93 testes** aprovados (incluindo CORS normalizado, MySQL 8.4 `LIMIT/OFFSET`, `reconnectingPlayers`, finalização imediata de quiz em desconexão e encerramento automático por abandono).
- **Frontend:** `npx tsc --noEmit` (`0` erros), `npm run lint` (`0` erros e `0` warnings) e `npm run build:web` (5 rotas estáticas exportadas: `/`, `/privacidade`, `/termos`, `/_sitemap`, `/+not-found`).
- **Qualidade:** `git diff --check` zerado.

## 4. Próximos Passos Estratégicos

1. **Expansão Pedagógica do Banco de Questões:** criar migration `004_expansao_banco_questoes.sql` elevando o acervo de **27** para **81–90 questões únicas balanceadas** (com `area_tematica`, BNCC e revisão junto ao Departamento de Matemática / ICE — UFRRJ).
2. **Kit Científico ICE-UFRRJ:** disponibilizar script/notebook exemplo em **Python / R** consumindo o CSV anonimizado exportado pelo Painel Docente (estatísticas descritivas, Qui-Quadrado, ANOVA e dificuldade de itens `p`).
3. **Verificação opcional de Branding Google:** apontar os links de Política de Privacidade e Termos no Google Cloud para `/privacidade` e `/termos`.
4. **Migração futura de provedor MySQL:** planejar migração antes do encerramento do **Aiven Free Tier em 2026-12-21**.

## 5. Documentos relacionados

- [README](../README.md): instalação, execução, testes e deploy.
- [GDD](./GDD.md): visão do jogo, regras v2.0 e princípios pedagógicos.
- [Arquitetura e operação](./ARQUITETURA_E_OPERACAO.md): contratos REST/Socket.IO, resiliência e operação.
- [Roadmap](./ROADMAP.md): fases concluídas e próximos incrementos.
- [Banco de dados e UML](./DATABASE_UML.md): modelo relacional, views estatísticas e diagramas.
