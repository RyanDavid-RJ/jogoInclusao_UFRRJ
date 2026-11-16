# Status do Projeto — Ludo Equidade

**Atualizado em:** 2026-11-16
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

- Pergunta individual para cada participante conectado.
- Prazo comum de 30 segundos controlado pelo servidor.
- Uma resposta por jogador.
- Gabarito mantido no backend até a validação.
- Pontuação dos acertos pela ordem de recebimento no servidor.
- Erros, prazo expirado e desconexões valem zero.
- Falha na busca de perguntas não inicia uma rodada parcial.
- MySQL/Aiven com a tabela `perguntas` e cobertura das nove combinações de
  etapa escolar e nível estrutural.

### Interface e publicação

- Frontend Expo/React Native exportado para web.
- Lobby responsivo com criação, lista pública e entrada por código funcionando
  em fluxos separados.
- Tema claro/escuro, modo daltônico, feedback de conexão e avisos dispensáveis.
- Tabuleiro, ranking, quiz, revelação final e controles com rótulos de
  acessibilidade.
- Backend Node.js/Express/Socket.IO publicado no Render.
- Frontend publicado na Vercel em:
  <https://jogoinclusaoufrrj.vercel.app/>
- Comunicação real entre navegador e backend por Socket.IO.
- Feedback de conexão, erros de sala, quiz, pausa e fim de partida.

## 3. Evidências de validação

Em 2026-11-16, a suíte do backend foi executada com **70 testes aprovados**.
Também foram aprovados:

- `npx tsc --noEmit` no frontend;
- `npm run lint` no frontend;
- `npm run build:web` no frontend;
- validação manual multiplayer no Expo Web com quatro jogadores;
- perguntas privadas, respostas, prazo, pausa e retomada do turno;
- autorização da rolagem somente para o jogador correto;
- encerramento e revelação do resultado.

O fluxo publicado foi exercitado com quatro sessões independentes e funcionou
adequadamente para o cenário de piloto.

## 4. Onde estamos agora

O sistema está adequado para demonstrações, testes com pequenos grupos e
validação pedagógica inicial. O servidor é a fonte de verdade durante uma
partida, mas as salas e o estado do jogo ficam em memória no processo Node.js.

Consequências conhecidas:

- reinício ou novo deploy do Render encerra as partidas ativas;
- quedas transitórias podem ser retomadas por até 60 segundos;
- reinício ou novo deploy não pode ser retomado porque o estado permanece em memória;
- salas de espera inativas são encerradas automaticamente após 30 minutos;
- múltiplas instâncias do backend não devem ser usadas sem estado compartilhado;
- o banco contém um conjunto inicial pequeno de perguntas;
- a validação nativa em Expo Go ainda precisa ser feita;
- a matriz de obstáculos e papéis ainda precisa de validação com pessoas com
  deficiência e educadores.

## 5. Para onde queremos ir

### Próxima etapa — confiabilidade do piloto

- Confirmar CORS e variáveis de produção no Render.
- Monitorar `/api/status`.
- Testar queda e retorno do navegador.
- Validar o fluxo em celular Android e iOS.
- Testar visualmente timeout, erro do quiz, explicação ausente e fim de jogo
  em navegador e dispositivo móvel.

### Etapa seguinte — conteúdo e acessibilidade

- Aumentar o banco de perguntas.
- Revisar perguntas com professores.
- Validar a matriz com pessoas com deficiência e especialistas.
- Implementar leitor de tela, contraste, teclado, redução de movimento e
  feedback que não dependa apenas de cor.
- Criar uma tela final de reflexão pedagógica.

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

