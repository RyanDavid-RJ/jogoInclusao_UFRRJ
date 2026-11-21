# Status do Projeto — Ludo Equidade

- **Atualizado em:** 2026-11-21
- **Estado:** Versão institucional **v2.0** implementada de ponta a ponta (GDD, Migrations SQL/Views, Backend v2.0, 88 testes automatizados e Frontend v2.0 com Painel Docente, Perfil e WCAG 2.1 AA) — pronta para aplicar migrações no MySQL e publicar

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

Em **2026-11-21**, todo o ciclo **v2.0 (Etapas 1 a 5)** foi implementado e validado:

1. **Etapa 1 — GDD v2.0** ([GDD.md](./GDD.md)): engajamento, rejogabilidade e alinhamento científico ICE-UFRRJ;
2. **Etapa 2 — Banco de Dados Analítico & UML** ([DATABASE_UML.md](./DATABASE_UML.md), `database/migrations/001..003`): 9 tabelas normalizadas + 5 views analíticas e datasets anonimizados;
3. **Etapa 3 — Arquitetura e Contratos** ([ARQUITETURA_E_OPERACAO.md](./ARQUITETURA_E_OPERACAO.md)): especificação completa REST + Socket.IO + OAuth + RBAC;
4. **Etapa 4 — Backend v2.0 & Testes**: regras v2.0, Google OAuth RS256/JWKS + JWT HS256, RBAC, persistência transacional pós-partida, CRUD docente, turmas, analytics e exportação CSV/JSON anonimizada (**88/88 testes** aprovados);
5. **Etapa 5 — Frontend Profissional v2.0**: redesign UX/UI responsivo, Login Google + Modo Convidado, consentimento LGPD, configurações de sala (`30/45/60s`, `6/8` rodadas, turma), feed narrativo de turno, pódio duplo + revanche instantânea, Perfil do Jogador (`Perspectivas 4/4` + histórico), Painel Docente completo e acessibilidade WCAG 2.1 AA.

## 2. O que foi realizado

### Produto, engajamento e regras (v1.0 + v2.0)

- Lobby para salas públicas e privadas com código de 4 caracteres, cópia rápida, listagem pública com badges de configuração e fechamento pelo anfitrião.
- Partidas de 4 a 8 participantes com escolha obrigatória de etapa escolar (`Fundamental`, `Médio`, `Superior`), tempo configurável de quiz (`30s`, `45s`, `60s`), limite de rodadas (`6` ou `8`) e vínculo opcional a **Código de Turma** docente.
- Papéis privados de acessibilidade (`cadeirante`, `cego`, `surdo`, `neuroatipico`) garantidos para os 4 primeiros jogadores e mantidos em sigilo até a **Virada da Equidade**.
- **Avanço por Equidade:** o primeiro jogador conectado a acertar o quiz do obstáculo ganha **+1 casa** no tabuleiro (sem encadear obstáculo e respeitando o limite da casa 30).
- **Pódio Duplo:** reconhecimento simultâneo de **Vencedor(es) da Corrida** e **Destaque(s) do Quiz**.
- **Revanche Instantânea (`play_again`):** o anfitrião inicia uma nova partida na mesma sala com **rotação automática de papéis** (derangement matemático para 4 jogadores), estimulando que todos vivenciem as 4 perspectivas.
- **Feed Narrativo de Turno (`lastEvent`):** destaque em tempo real das rolagens, impulsos (+2), obstáculos e avanços por equidade (+1).

### Autenticação, Contas e Pesquisa Científica (ICE — UFRRJ)

- **Google OAuth 2.0 (OIDC RS256 via JWKS)** + **JWT HS256** nativos (zero dependências extras no backend) + **Modo Convidado** 100% funcional sem cadastro.
- Controle de acesso RBAC (`jogador`, `professor`, `admin`) com promoção automática via `BOOTSTRAP_ADMIN_EMAIL` e compatibilidade com `X-Question-Admin-Token` (comparação em tempo constante).
- Consentimento explícito para pesquisa acadêmica (**LGPD**, `consentimento_pesquisa`, opt-in revogável a qualquer momento tanto para logados quanto para convidados).
- Persistência transacional pós-partida (`partidas`, `partida_participantes`, `partida_turnos`, `quiz_rodadas`, `quiz_respostas`) com degradação segura se as migrações v2 ainda não tiverem sido aplicadas no banco.
- **5 Views analíticas MySQL 8:** `vw_desempenho_perguntas`, `vw_equidade_por_condicao`, `vw_matriz_empirica`, `vw_dataset_anonimo_participacoes` e `vw_dataset_anonimo_respostas` (zero PII).
- **Painel de Professores & Pesquisa** na interface Web:
  - *Indicadores & LGPD:* KPIs, equidade por condição, matriz empírica obstáculo × condição e download com 1 clique em **CSV/JSON anonimizado** (pronto para R/Python/SPSS);
  - *Banco de Questões:* busca/filtros, criação/edição, aprovação/arquivamento e diagnóstico psicométrico empírico (`p`, tempo médio, distribuição de distratores A/B/C/D);
  - *Turmas Pedagógicas:* cadastro de turmas com código e atalho direto para abrir sala vinculada;
  - *Usuários (Admin):* promoção de docentes para `professor`/`admin`.

### Confiabilidade, Interface e Acessibilidade

- Logger estruturado (`backend/utils/logger.js`) com redação recursiva de segredos e PII.
- Reconexão temporária de sessão por até 60 segundos (`resume_room`), expiração de salas inativas em 30 minutos, rate limiting por evento e encerramento gracioso (`SIGTERM`/`SIGINT`).
- Interface Expo / React Native (React Compiler ativo) sem `shadow*` no `StyleSheet`, com tema claro/escuro, modo daltônico, respeito à redução de movimento (`useReducedMotion`), foco visível na Web (`:focus-visible`) e **atalhos de teclado no Quiz** (`A–D`, `Enter`, `Esc`).
- Compatibilidade total com produção atual (Render + Vercel + Aiven MySQL `defaultdb` com 27 perguntas únicas balanceadas) mesmo antes de aplicar as migrações `002` e `003`.

## 3. Evidências de validação

Em **2026-11-21**, a validação automatizada completa passou sem erros:

- **Backend:** **88/88 testes** aprovados (`node --test`), cobrindo `gameEngine`, `lobby`, `quizService`, `questionRepository`, `api` (v1 + v2 RBAC/OAuth/Analytics/Export), `authService` (JWT + Google RS256 JWKS), `matchRepository` (transação + rollback + fallback), `logger` e integração real Socket.IO;
- **Frontend:** `npx tsc --noEmit`, `npm run lint` (ESLint Expo + React Compiler) e `npm run build:web` aprovados sem erros;
- **Qualidade de diff:** `git diff --check` aprovado sem problemas de formatação.

## 4. Próximos Passos Operacionais e Pedagógicos

1. **Aplicar migrações SQL no MySQL ativo (`defaultdb`):** executar `database/migrations/001`, `002` e `003` no MySQL Workbench conforme [`database/README.md`](../database/README.md).
2. **Configurar variáveis opcionais de OAuth (Render + Vercel):** definir `GOOGLE_CLIENT_ID`, `JWT_SECRET` e `BOOTSTRAP_ADMIN_EMAIL` no Render e `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` na Vercel quando desejar ativar o login Google em produção (o Modo Convidado e o acesso docente por `QUESTION_ADMIN_TOKEN` já funcionam de imediato).
3. **Expansão pedagógica do acervo:** expandir o banco de **27** para **54–90 questões únicas balanceadas** com `area_tematica` e revisão junto aos docentes do Departamento de Matemática (ICE — UFRRJ) e pessoas com deficiência.
4. **Validação multiplataforma pós-deploy:** testar o fluxo v2.0 em produção (desktop, Safari iPhone, navegador Android e Expo Go).
5. **Migração futura de provedor MySQL:** planejar migração antes do encerramento do **Aiven Free Tier em 2026-12-21** utilizando backup lógico + scripts portáveis em `database/migrations/`.

## 5. Documentos relacionados

- [README](../README.md): instalação, execução, testes e deploy.
- [GDD](./GDD.md): visão do jogo, regras v2.0 e princípios pedagógicos.
- [Arquitetura e operação](./ARQUITETURA_E_OPERACAO.md): contratos REST/Socket.IO, segurança e operação.
- [Roadmap](./ROADMAP.md): fases concluídas e próximos incrementos.
- [Banco de dados e UML](./DATABASE_UML.md): modelo relacional, views estatísticas e diagramas.
