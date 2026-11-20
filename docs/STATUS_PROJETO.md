# Status do Projeto — Ludo Equidade

**Atualizado em:** 2026-11-20
**Estado:** MVP web funcional em piloto controlado

## 1. O que queríamos construir

O Ludo Equidade é um jogo de tabuleiro educativo multiplayer sobre matemática,
inclusão e acessibilidade. A proposta é mostrar que uma mesma barreira pode
afetar pessoas de formas diferentes e estimular uma conversa sobre equidade,
sem afirmar que os papéis do jogo representam a experiência universal de uma
pessoa real.

O primeiro ciclo definido para o MVP foi:

1. criar ou entrar em uma sala;
2. reunir de 4 a 8 participantes;
3. escolher a etapa escolar;
4. sortear papéis privados;
5. jogar em turnos em um tabuleiro de 0 a 30;
6. receber Impulso (+2) nas casas 5, 10, 15, 20 e 25 e abrir um quiz
   simultâneo ao pousar nas casas 7, 14, 21 ou 28;
7. pontuar as respostas e retomar a partida;
8. declarar o resultado e revelar os papéis no final.

O escopo inicial priorizou uma partida jogável e verificável. Login externo,
histórico de partidas e escalabilidade horizontal ficaram fora do primeiro
ciclo.

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

## 5. Para onde queremos ir

### Próxima etapa — confiabilidade do piloto e publicação

- Validar em produção (Vercel/Render) as melhorias de Prioridade 3: métricas
  observadas do `GameOverModal`, perguntas sem repetição, timeout, `quiz_error`,
  explicação ausente e reconexão durante quiz em desktop, Safari (iPhone) e
  navegador Android.
- Monitorar `/api/status` continuamente.
- Planejar e executar a migração do banco MySQL antes do encerramento do
  Aiven Free Tier em **2026-12-21**.
- Validar o fluxo nativo em Expo Go (Android e iOS) quando o foco avançar além
  do piloto web.

### Etapa seguinte — conteúdo e acessibilidade

- Continuar expandindo o banco de perguntas além das 27 questões atuais (a
  prevenção de repetição dentro da mesma partida já está implementada).
- Revisar perguntas com professores.
- Validar a matriz e as métricas de reflexão com pessoas com deficiência e
  especialistas.
- Completar suporte a leitor de tela, navegação por teclado e alternativas para
  eventuais alertas sonoros.
- Validar com a comunidade ilustrações humanas diversas para a revelação
  pós-jogo.

### Evolução de produção

- Usar Redis/Socket.IO Adapter se houver mais de uma instância.
- Manter limites de frequência e ampliar a proteção contra abuso conforme o
  tráfego real.
- Criar credencial de banco específica para a aplicação, com privilégios
  mínimos.
- Avaliar persistência de partidas, ranking e autenticação somente quando
  houver requisito real.

## 6. Documentos relacionados

- [README](../README.md): instalação, execução, testes e deploy.
- [GDD](./GDD.md): visão do jogo, regras e princípios pedagógicos.
- [Arquitetura e operação](./ARQUITETURA_E_OPERACAO.md): funcionamento técnico
  e limites do ambiente atual.
- [Roadmap](./ROADMAP.md): próximos incrementos organizados por prioridade.
- [Banco de dados](./DATABASE_UML.md): modelo, decisões e integração MySQL.

