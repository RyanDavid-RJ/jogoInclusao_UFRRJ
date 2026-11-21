# Status do Projeto — Ludo Equidade

**Atualizado em:** 2026-11-21
**Estado:** MVP web v1.0 funcional em produção · Fundação v2.0 (GDD, Banco Analítico/UML e Arquitetura ICE-UFRRJ) concluída e pronta para implementação

## 1. Visão e Contexto Atual

O Ludo Equidade é um jogo de tabuleiro educativo multiplayer sobre matemática,
inclusão e acessibilidade, em evolução para apresentação institucional ao
**Departamento de Matemática do Instituto de Ciências Exatas (ICE — UFRRJ)**
como produto educacional e potencial projeto de **Iniciação Científica (IC)**.

A proposta alia ensino ativo de matemática e debate sobre equidade a uma
arquitetura de dados projetada para estudos de **Estatística, Probabilidade,
Processos Estocásticos e Inferência**, preservando rigor ético (LGPD,
pseudonimização e consentimento explícito) e sem afirmar que papéis de jogo
representam a experiência universal de pessoas reais.

O ciclo **v1.0 (MVP publicado)** entregou uma partida multiplayer completa e
validada em produção (Render + Vercel + MySQL/Aiven). Em **2026-11-21**, foi
concluída a fundação de engenharia da **v2.0** ([GDD](./GDD.md),
[DATABASE_UML](./DATABASE_UML.md), `database/migrations/001..003` e
[ARQUITETURA_E_OPERACAO](./ARQUITETURA_E_OPERACAO.md)) para incorporar:

1. melhorias de engajamento e rejogabilidade (*Avanço por Equidade*, duplo pódio, revanche instantânea com rotação de papéis, tempo configurável de quiz e feed de eventos);
2. contas com **Login Google (OAuth 2.0)** + **Modo Convidado** e papéis RBAC (`jogador`, `professor`, `admin`);
3. persistência transacional pós-partida (9 tabelas + 5 views analíticas e datasets anonimizados para R/Python);
4. **Painel de Professores** (gestão/revisão de perguntas, turmas, indicadores empíricos e exportação CSV/JSON).

## 2. O que foi realizado

### Produto e regras

- Lobby para salas públicas e privadas.
- Código de sala de quatro caracteres.
- Mínimo de 4 e máximo de 8 jogadores.
- Início manual pelo anfitrião.
- Transferência do anfitrião quando ele desconecta.
- Perfil local com nome e avatar.
- Etapa escolar: Fundamental, Médio ou Superior.
- Papéis distribuídos de forma que os quatro papéis apareçam em uma partida
  com pelo menos quatro jogadores.
- Papel individual privado durante a partida.
- Revelação do mapa jogador–papel no encerramento.

### Motor do jogo

- Ordem de turnos sorteada pelo servidor.
- Dado de seis lados.
- Movimento limitado à casa 30.
- Impulso (+2) nas casas 5, 10, 15, 20 e 25, limitado à chegada.
- Obstáculos nas casas 7, 14, 21 e 28.
- Partida pausada enquanto o quiz simultâneo está aberto.
- Limite de oito rodadas completas.
- Desempate por posição, pontos do quiz e, se necessário, campeões
  compartilhados.

### Quiz e banco

- Pergunta individual para cada participante conectado, evitando repetição de
  questões dentro da mesma rodada e ao longo da mesma partida (`usedQuestionIds`
  com fallback automático se o acervo da combinação se esgotar).
- Prazo comum de 30 segundos controlado pelo servidor.
- Uma resposta por jogador.
- Gabarito mantido no backend até a validação.
- Pontuação dos acertos pela ordem de recebimento no servidor.
- Erros, prazo expirado e desconexões valem zero.
- Falha na busca de perguntas não inicia uma rodada parcial.
- MySQL/Aiven com a tabela `perguntas` limpa e balanceada em produção (`defaultdb`),
  com **27 perguntas únicas** (3 para cada uma das 9 combinações de etapa escolar
  e nível estrutural), cobrindo `database/schema_e_seed.sql` e
  `database/perguntas_expansao.sql` (idempotente contra duplicações e com gabarito
  da sequência `4, 11, 18, 25...` corrigido para `C`).
- API REST dedicada (`backend/api.js`) com `GET /api/status`, `GET /api/perguntas`
  (sem gabarito) e `POST /api/perguntas` protegido por `X-Question-Admin-Token`.

### Confiabilidade e operação no backend

- Reconexão temporária de sessão por até 60 segundos (`sessionToken` +
  `resume_room`/`room_resumed`), incluindo remapeamento de perguntas e aceite de
  respostas durante rodadas ativas de quiz.
- Expiração automática de salas de espera inativas após 30 minutos.
- Limites de frequência (rate limiting) por socket nos eventos críticos.
- Exigência de `CLIENT_ORIGIN` explícito (sem `*`) quando `NODE_ENV=production`
  (validado no Render em produção com `https://jogoinclusaoufrrj.vercel.app`,
  `QUESTION_ADMIN_TOKEN` ativo e serviço operacional na porta 10000).
- Encerramento gracioso ao receber `SIGTERM`/`SIGINT`, sinalizando
  indisponibilidade em `/api/status` antes de fechar Socket.IO, HTTP e pool MySQL.

### Interface e publicação

- Frontend Expo/React Native (React Compiler ativo) exportado para web.
- Lobby responsivo com criação de sala pública ou privada, lista pública, entrada
  por código, botão para copiar código da sala e opção de fechar sala (`close_room`)
  com confirmação para o anfitrião.
- Sessão Socket.IO, reconexão (`AppState` + `resume_room`) e timer de quiz
  isolados no hook dedicado `frontend/src/hooks/useGameSession.ts`.
- Tema claro/escuro (com contraste ajustado em superfícies de destaque/alerta),
  modo daltônico, respeito à redução de movimento (`useReducedMotion`), área
  segura (`useSafeAreaInsets`), rolagem única no mobile (`ScrollView` sem
  aninhamento) e tentativa de reconexão ao retornar ao primeiro plano (`AppState`).
- Tabuleiro sinuoso exato de 0 a 30 (`BoardTrack`), ranking ao vivo, dado com
  gesto e indicador de rodada (`Rodada X/8`), modal de quiz com leitura do
  resultado/explicação até o clique em "Continuar" (`QuizModal`), tela final de
  revelação com **métricas observadas da partida** (média de dado, impulsos,
  acertos e níveis enfrentados N1/N2/N3), síntese do grupo, nota pedagógica e
  retorno limpo à tela inicial (`GameOverModal`).
- Backend Node.js/Express/Socket.IO publicado no Render.
- Frontend publicado na Vercel em:
  <https://jogoinclusaoufrrj.vercel.app/>
- Comunicação real entre navegador e backend por Socket.IO.
- Feedback de conexão, erros de sala, quiz, pausa e fim de partida.

## 3. Evidências de validação

Em 2026-11-20, a suíte automatizada foi validada com **76/76 testes aprovados**
no backend (`node --test`), além de aprovação sem erros em:

- `npx tsc --noEmit` no frontend;
- `npm run lint` no frontend;
- `npm run build:web` no frontend (validado no ciclo de publicação);
- validação manual multiplayer no Expo Web e em produção (Render + Vercel) com quatro jogadores;
- validação no Safari em iPhone físico após publicação das correções de rolagem e reconexão;
- perguntas privadas sem repetição na partida, respostas, prazo, pausa e retomada do turno;
- autorização da rolagem somente para o jogador correto;
- encerramento e revelação do resultado com métricas observadas.

O fluxo publicado foi exercitado com quatro sessões independentes e funcionou
adequadamente para o cenário de piloto.

## 4. Onde estamos agora

O sistema está adequado para demonstrações, testes com pequenos grupos e
validação pedagógica inicial. O servidor é a fonte de verdade durante uma
partida, mas as salas e o estado do jogo ficam em memória no processo Node.js.

Consequências e riscos operacionais conhecidos:

- reinício ou novo deploy do Render encerra as partidas ativas;
- quedas transitórias podem ser retomadas por até 60 segundos;
- reinício ou novo deploy não pode ser retomado porque o estado permanece em memória;
- salas de espera inativas são encerradas automaticamente após 30 minutos;
- múltiplas instâncias do backend não devem ser usadas sem estado compartilhado;
- **Aiven MySQL Free Tier encerra em 2026-12-21** (backup local já salvo;
  planejar migração de hospedagem MySQL antes dessa data);
- as melhorias mais recentes de Prioridade 3 (`useGameSession`, perguntas sem
  repetição, métricas observadas no `GameOverModal`, botão de copiar código e
  indicador de rodada) já foram enviadas ao repositório (`main`) e aguardam
  validação visual em produção (desktop, Safari iPhone e navegador Android);
- a validação nativa em Expo Go e em navegador Android ainda precisa ser feita;
- a matriz de obstáculos e papéis ainda precisa de validação com pessoas com
  deficiência e educadores.

## 5. Para onde queremos ir (Próximas Etapas)

### Etapa 4 — Backend v2.0, Persistência Analítica, OAuth e Testes (próximo passo)

- Aplicar as migrações `database/migrations/001..003` no banco ativo (`defaultdb`).
- Implementar gameplay v2.0 (Avanço por Equidade +1 casa no 1º acerto, duplo pódio, revanche na mesma sala com rotação de papéis, tempo de quiz `30/45/60s`, feed de turno e medição de `tempo_resposta_ms`).
- Implementar Google OAuth + JWT + RBAC (`jogador`/`professor`/`admin`) mantendo o Modo Convidado sem atrito.
- Implementar persistência transacional pós-partida, histórico pessoal, CRUD docente de perguntas, turmas e endpoints analíticos/exportação anonimizada CSV/JSON.
- Adicionar logger estruturado e expandir a suíte de testes automatizados (`npm test`).

### Expansão Pedagógica do Banco de Perguntas

- Expandir o acervo de 27 para 54–90 questões únicas balanceadas com `area_tematica` preenchida e revisão pedagógica junto ao Departamento de Matemática (ICE-UFRRJ).

### Etapa 5 — Frontend Profissional (UX/UI, Painel Docente e WCAG)

- Evoluir a interface com foco em engajamento, clareza visual, narrativa viva do turno e acessibilidade WCAG 2.1 AA (navegação por teclado na Web, leitor de tela e contraste validado).
- Integrar tela de Login Google / Convidado, perfil com histórico pessoal, fluxo de revanche e **Painel de Professores** com métricas empíricas e exportação anonimizada.
- Validar em desktop, Safari iPhone, navegador Android e Expo Go nativo.

### Operação Contínua

- Migrar hospedagem MySQL antes do encerramento do Aiven Free Tier (**2026-12-21**) usando os scripts portáveis versionados.
- Criar credencial de banco específica para a aplicação com privilégios mínimos e monitorar `/api/status`.
- Avaliar Redis/Socket.IO Adapter quando houver necessidade de múltiplas instâncias.

## 6. Documentos relacionados

- [README](../README.md): instalação, execução, testes e deploy.
- [GDD](./GDD.md): visão do jogo, regras e princípios pedagógicos.
- [Arquitetura e operação](./ARQUITETURA_E_OPERACAO.md): funcionamento técnico
  e limites do ambiente atual.
- [Roadmap](./ROADMAP.md): próximos incrementos organizados por prioridade.
- [Banco de dados](./DATABASE_UML.md): modelo, decisões e integração MySQL.

