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
- [x] 63 testes backend aprovados.
- [x] TypeScript e lint aprovados.
- [x] Export web de produção aprovado.
- [x] Teste manual com quatro jogadores.

## Fase 1 — Confiabilidade do piloto

**Prioridade: alta**

- [ ] Confirmar CORS restrito ao domínio publicado.
- [ ] Monitorar `/api/status` continuamente.
- [ ] Definir política para salas abandonadas.
- [ ] Testar deploy/reinício durante uma partida.
- [ ] Testar perda e retorno da conexão do jogador.
- [ ] Validar o fluxo em dispositivo Android e iOS.
- [ ] Validar visualmente timeout, `quiz_error`, explicação ausente e fim de jogo.

**Critério de saída:** um grupo pequeno consegue completar partidas no web e
em pelo menos um dispositivo móvel, com mensagens claras nos cenários de
falha.

## Fase 2 — Conteúdo e acessibilidade

**Prioridade: alta**

- [ ] Expandir as perguntas por etapa e nível.
- [ ] Revisar o banco com professores.
- [ ] Revisar linguagem, matriz e obstáculos com pessoas com deficiência.
- [ ] Adicionar suporte a leitor de tela e teclado.
- [ ] Verificar contraste e comunicação sem depender apenas de cor.
- [ ] Respeitar redução de movimento e oferecer alternativas a alertas sonoros.
- [ ] Criar tela final de reflexão pedagógica.

**Critério de saída:** o jogo é compreensível, utilizável e pedagogicamente
defensável para o público definido, com registro das decisões de validação.

## Fase 3 — Reconexão e preparação para escala

**Prioridade: média**

- [ ] Criar identidade temporária de sessão.
- [ ] Permitir reconexão à sala e restauração do estado.
- [ ] Definir comportamento de reconexão durante o quiz.
- [ ] Adicionar expiração e limpeza de salas inativas.
- [ ] Adicionar limites de frequência para eventos.
- [ ] Avaliar Redis e Socket.IO Adapter.
- [ ] Separar logs operacionais de dados de jogo.

**Critério de saída:** uma queda do navegador não encerra indevidamente a
participação e a arquitetura suporta mais de uma instância quando necessário.

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

- casas bônus e multiplicadores;
- persistência do estado ativo das partidas;
- escala horizontal sem necessidade comprovada;
- coleta ampla de analytics;
- representação definitiva das condições sem validação comunitária.

