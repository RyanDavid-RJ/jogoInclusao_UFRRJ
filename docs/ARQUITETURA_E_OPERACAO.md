# Arquitetura e Operação — Ludo Equidade

## 1. Visão geral

O sistema é um monorepo com três partes principais:

```text
Navegador ou Expo Go
        |
        | HTTP + Socket.IO
        v
Backend Node.js + Express + Socket.IO
        |
        | mysql2/promise
        v
MySQL hospedado no Aiven
```

O frontend apresenta o jogo e envia ações. O backend valida as ações, mantém o
estado autoritativo da partida e consulta perguntas. O banco guarda o conteúdo
das perguntas, não o estado ativo das partidas.

## 2. Frontend

O frontend está em `frontend/` e usa Expo, React Native, Expo Router,
TypeScript e `socket.io-client`.

Responsabilidades:

- exibir splash, perfil, lobby público/privado, sala, tabuleiro, quiz e
  resultado;
- abrir a conexão Socket.IO;
- mostrar somente as ações permitidas pelo estado recebido;
- enviar criação/entrada de sala, escolha da etapa, início, rolagem e resposta;
- apresentar erros de sala e conexão sem ocultar falhas de operação;
- oferecer tema claro/escuro e modo daltônico sem alterar as regras do jogo;
- limpar o estado local quando a conexão é encerrada;
- nunca decidir o gabarito ou a pontuação.

O mesmo código é preparado para web e mobile. O deploy atual utiliza:

- Build: `npm run build:web`;
- Saída: `dist`;
- Hospedagem: Vercel;
- URL publicada: <https://jogoinclusaoufrrj.vercel.app/>.

`EXPO_PUBLIC_SERVER_URL` é uma configuração pública do cliente e deve apontar
para o backend Render. Não deve conter senha ou outro segredo.

## 3. Backend

O backend está em `backend/` e é iniciado por `node server.js` ou `npm start`.

### `server.js`

- carrega variáveis de ambiente;
- configura CORS;
- cria o servidor HTTP e o Socket.IO;
- expõe `GET /api/status`;
- cria o pool MySQL;
- registra os handlers do lobby.

### `lobby.js`

Coordena salas, sockets e eventos multiplayer:

- cria, lista, entra, sai e fecha salas;
- valida perfis e permissões do anfitrião;
- inicia a partida;
- chama o motor para rolagem e movimentação;
- inicia e encerra rodadas de quiz;
- trata desconexões e transferência de anfitrião.

### `gameEngine.js`

Contém as regras puras do tabuleiro:

- posições;
- ordem de turnos;
- dado;
- obstáculos;
- rodadas;
- pontuação;
- condição de término;
- desempates.

### `quizService.js`

Coordena a preparação das perguntas, derivando o nível estrutural conforme o
obstáculo e o papel do jogador. O serviço garante que o backend não envie
gabarito antes da resposta ser validada.

### `questionRepository.js`

Executa consultas parametrizadas em `perguntas`, filtrando por etapa escolar e
nível estrutural. A projeção pública contém apenas enunciado e alternativas.

## 4. Estado e ciclo de uma partida

O ciclo simplificado é:

1. socket cria a sala;
2. sockets entram e recebem `room_updated`;
3. o anfitrião escolhe a etapa;
4. o anfitrião inicia;
5. o servidor cria o estado do jogo e distribui cada papel individualmente;
6. o jogador do turno envia `roll_dice`;
7. o servidor atualiza a posição;
8. se houver pouso exato em obstáculo, o servidor busca todas as perguntas;
9. cada participante recebe uma pergunta privada;
10. respostas são validadas no servidor;
11. o quiz termina por respostas completas ou prazo;
12. o servidor pontua e libera o próximo turno;
13. o jogo termina por posição 30 ou limite de rodadas;
14. `game_over` revela o resultado final.

Eventos privados, como `game_started`, `quiz_question` e `quiz_result`, são
enviados ao socket correspondente. Eventos de estado compartilhado são
enviados à sala.

## 5. Banco de dados

O banco atual é MySQL no Aiven, com `defaultdb` como banco de aplicação
confirmado para o protótipo. O script versionado está em
`database/schema_e_seed.sql`.

A tabela `perguntas` contém:

- etapa escolar;
- nível estrutural;
- enunciado;
- quatro alternativas;
- resposta correta;
- explicação opcional;
- tags.

`GET /api/perguntas` usa uma projeção sem `resposta_correta`. O cadastro via
`POST /api/perguntas` exige `QUESTION_ADMIN_TOKEN` no cabeçalho
`X-Question-Admin-Token`; CORS não substitui essa autenticação.

O gabarito permanece disponível apenas no servidor. A aplicação usa TLS quando
`DB_SSL=true` e recebe o certificado CA por arquivo seguro ou variável de
ambiente. Credenciais e certificados não pertencem ao repositório.

## 6. Deploy atual

### Render

- Root Directory: `backend`;
- Build Command: `npm ci`;
- Start Command: `npm start`;
- Health Check: `/api/status`;
- variáveis: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
  `DB_NAME`, `DB_SSL`, `DB_CA_CERT` e `CLIENT_ORIGIN`.

### Vercel

- Root Directory: `frontend`;
- Build Command: `npm run build:web`;
- Output Directory: `dist`;
- variável: `EXPO_PUBLIC_SERVER_URL`.

## 7. Limitações operacionais conhecidas

O mapa `rooms` e os estados das partidas vivem na memória de uma única
instância. Portanto:

- reinício do processo perde salas e partidas;
- deploy durante uma partida desconecta os jogadores;
- escala horizontal exige armazenamento compartilhado e adapter Socket.IO;
- ainda não existe reconexão com restauração automática da sessão.

Essas limitações são aceitas para o MVP e devem ser resolvidas antes de um
lançamento com tráfego imprevisível.

## 8. Segurança e operação recomendadas

- definir `CLIENT_ORIGIN` sem usar `*` em produção;
- limitar criação, listagem e entrada de salas;
- aplicar limites de frequência também aos eventos de retomada, rolagem e resposta;
- expirar salas de espera inativas após 30 minutos;
- criar usuário MySQL próprio com privilégios mínimos;
- manter logs sem senhas, tokens ou conteúdo sensível;
- monitorar o health check;
- adicionar encerramento gracioso do pool;
- registrar erros com contexto suficiente para diagnóstico;
- não coletar nome, imagem ou analytics sem uma política adequada de privacidade.

