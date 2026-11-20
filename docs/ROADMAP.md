# Roadmap — Ludo Equidade

Este roadmap separa o que já está entregue do que precisa ser validado antes
de ampliar o uso. A prioridade é preservar o núcleo jogável enquanto se
reduzem riscos técnicos e pedagógicos.

## Fase atual — MVP web publicado

**Status: concluída para piloto controlado**

- [x] Frontend Expo publicado na Vercel.
- [x] Backend Socket.IO publicado no Render.
- [x] Banco MySQL/Aiven configurado.
- [x] Lobby de 4 a 8 jogadores.
- [x] Partida, turnos, obstáculos e fim.
- [x] Quiz individual e simultâneo.
- [x] Papéis privados e revelação final.
- [x] Lobby visual responsivo com lista pública e entrada por código.
- [x] Tema claro/escuro, modo daltônico e feedback de erros/conexão.
- [x] 76 testes backend aprovados.
- [x] TypeScript e lint aprovados.
- [x] Export web de produção aprovado.
- [x] Teste manual com quatro jogadores.

## Fase 1 — Estabilização e confiabilidade do piloto

**Prioridade: alta**

- [x] Corrigir fluxo de leitura do `quiz_result`/`quiz_error` antes da limpeza por `quiz_round_ended`.
- [x] Corrigir reconexão durante quiz ativo (`quizRound.disconnected` e remapeamento de `quizRound.questions`).
- [x] Corrigir retorno do `GameOverModal` (limpeza completa de estado/referências e saída da sala).
- [x] Remover casas extras `31` e `32` da última linha visual do `BoardTrack`.
- [x] Ajustar contraste de cartões/badges pastéis no modo escuro.
- [x] Expor escolha de sala pública/privada ao criar sala e ação de fechar sala (`close_room`) para o anfitrião.
- [x] Confirmar CORS restrito ao domínio publicado (`CLIENT_ORIGIN` + `NODE_ENV=production`) e `QUESTION_ADMIN_TOKEN` no Render.
- [x] Definir política para salas abandonadas: salas de espera inativas expiram
      após 30 minutos.
- [x] Publicar ajustes de Prioridade 1 e 2 na Vercel/Render e retestar no Safari (iPhone físico).
- [ ] Validar em produção (Vercel/Render) o lote de Prioridade 3 (`useGameSession`, métricas observadas, perguntas sem repetição, copiar código e indicador de rodada) e testar também em navegador Android (incluindo timeout, `quiz_error`, explicação ausente e `GameOverModal`).
- [ ] Monitorar `/api/status` continuamente.
- [ ] Migrar hospedagem MySQL antes do encerramento do Aiven Free Tier em **2026-12-21** (backup local já preservado).
- [ ] Testar deploy/reinício durante uma partida e perda/retorno da conexão durante quiz ativo em produção.
- [ ] Validar o fluxo nativo em Expo Go (Android e iOS) quando o foco avançar além do piloto web.

**Critério de saída:** um grupo pequeno consegue completar partidas no navegador
(desktop e mobile), com leitura clara do resultado/explicação do quiz, boa
legibilidade nos temas claro/escuro e banco hospedado em provedor estável além
de 2026-12-21.

## Fase 2 — Conteúdo e acessibilidade

**Prioridade: alta**

- [x] Aplicar e limpar `database/perguntas_expansao.sql` em `defaultdb` (27 perguntas únicas, 3 por combinação etapa × nível; script versionado idempotente e com gabarito do ID 14 corrigido).
- [x] Evitar repetição de perguntas na mesma rodada e na mesma partida (`usedQuestionIds` com fallback automático).
- [x] Enriquecer a tela final de reflexão pedagógica (`GameOverModal`) com métricas observadas da partida (média de dado, impulsos, acertos e níveis N1/N2/N3) e nota pedagógica.
- [ ] Expandir ainda mais o banco por etapa e nível.
- [ ] Revisar o banco com professores.
- [ ] Revisar linguagem, matriz, métricas e obstáculos com pessoas com deficiência.
- [ ] Adicionar suporte completo a leitor de tela e navegação por teclado.
- [ ] Verificar contraste (WCAG) em ambos os temas e comunicação sem depender apenas de cor.
- [x] Respeitar redução de movimento (`useReducedMotion` nos componentes animados).
- [ ] Oferecer alternativas textuais/visuais caso alertas sonoros sejam introduzidos.
- [ ] Validar ilustrações humanas diversas para a revelação pós-jogo com a comunidade.

**Critério de saída:** o jogo é compreensível, utilizável e pedagogicamente
defensável para o público definido, com registro das decisões de validação.

## Fase 3 — Reconexão e preparação para escala

**Prioridade: média**

- [x] Criar identidade temporária de sessão.
- [x] Permitir reconexão à sala e restauração do estado por 60 segundos.
- [x] Definir comportamento de reconexão durante o quiz.
- [x] Adicionar expiração e limpeza de salas de espera inativas.
- [x] Adicionar limites de frequência para eventos sensíveis.
- [ ] Avaliar Redis e Socket.IO Adapter.
- [ ] Separar logs operacionais de dados de jogo.

**Critério de saída:** uma queda transitória do navegador não encerra
indevidamente a participação; a arquitetura ainda requer estado compartilhado
antes de suportar múltiplas instâncias.

## Fase 4 — Produto institucional

**Prioridade: condicionada à demanda**

- [ ] Definir autenticação e provedor OAuth.
- [ ] Definir política de privacidade e tratamento de dados.
- [ ] Criar histórico de partidas somente se houver necessidade.
- [ ] Avaliar ranking e métricas pedagógicas.
- [ ] Criar painel ou processo de manutenção do banco de perguntas.
- [ ] Configurar domínio institucional, se necessário.

Login Google, ranking e histórico não devem ser implementados antes de existir
uma decisão clara sobre identidade, consentimento, retenção e finalidade dos
dados.

## Fora do escopo imediato

- multiplicadores (casas bônus de Impulso +2 já estão implementadas);
- persistência do estado ativo das partidas;
- escala horizontal sem necessidade comprovada;
- coleta ampla de analytics;
- representação definitiva das condições sem validação comunitária.

