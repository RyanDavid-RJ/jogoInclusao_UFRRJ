# Ludo Equidade

Jogo multiplayer de tabuleiro educativo sobre inclusão, acessibilidade e
matemática, desenvolvido com Expo/React Native no frontend e Node.js, Express,
Socket.IO e MySQL no backend.

## Funcionalidades

- Criação de salas públicas e privadas, listagem pública e entrada por código de 4 caracteres.
- Partidas para 4 a 8 participantes, com um anfitrião que escolhe a etapa escolar e inicia manualmente.
- Tabuleiro compartilhado com posições de 0 a 30, turnos, rodadas e lançamento de dado (botão ou gesto).
- Casas bônus de Impulso (+2 casas) nas posições 5, 10, 15, 20 e 25, com chegada limitada à casa 30.
- Condição atribuída individualmente a cada participante, mantida em sigilo até a revelação final com perguntas de reflexão.
- Pausa coletiva quando alguém para nas casas-obstáculo 7, 14, 21 ou 28, disparando quiz simultâneo de 30 segundos.
- Reconexão automática de sessão por até 60 segundos em quedas transitórias e expiração de salas de espera inativas após 30 minutos.
- Interface responsiva com tema claro/escuro, modo daltônico, respeito à redução de movimento, feedback de conexão e mensagens de erro acessíveis.

**Estado atual (2026-11-20):** o MVP web está publicado (Render + Vercel) e
validado com quatro jogadores. O ciclo de sala pública/privada, turnos,
movimento, obstáculos, quiz, reconexão e encerramento está funcional. O backend
passou 72/72 testes, TypeScript e lint do frontend passaram, e o banco em
produção conta com 27 perguntas únicas balanceadas (3 por combinação de etapa
escolar × nível estrutural). O estado das salas ainda fica em memória em uma
única instância; por isso, recuperação após reinício continua fora do MVP.
Quedas transitórias podem ser retomadas por até 60 segundos. Consulte
[`docs/STATUS_PROJETO.md`](docs/STATUS_PROJETO.md) para detalhes operacionais
(incluindo a migração planejada do MySQL antes de 2026-12-21).

## Documentação do projeto

- [Status do projeto](docs/STATUS_PROJETO.md): o que queríamos, o que foi
  realizado, estado atual, evidências e direção futura.
- [Arquitetura e operação](docs/ARQUITETURA_E_OPERACAO.md): responsabilidades
  do frontend, backend, banco e deploy.
- [Roadmap](docs/ROADMAP.md): prioridades, critérios de saída e itens adiados.
- [GDD](docs/GDD.md): visão pedagógica, regras e princípios de design.
- [Banco de dados e UML](docs/DATABASE_UML.md): modelo, decisões e integração.

## Tecnologias

- **Frontend:** Expo, React Native, Expo Router, TypeScript e `socket.io-client`.
- **Backend:** Node.js, Express, Socket.IO e MySQL (`mysql2`).

## Pré-requisitos

- Node.js e npm.
- MySQL acessível com as credenciais de conexão.
- Um navegador para jogar na Web ou Expo Go para testar em dispositivos móveis.

## Configuração

### 1. Instale as dependências

Em dois terminais, execute na raiz do repositório:

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

### 2. Configure o backend

Copie `backend/.env.example` para `backend/.env` e ajuste as configurações de conexão com o seu banco.

`backend/.env` é ignorado pelo Git. Não publique senhas, certificados ou outros segredos. Para bancos que exigem TLS, configure `DB_SSL=true` e disponibilize o certificado CA em `backend/ca.pem` por um meio seguro; arquivos de certificado também são ignorados pelo Git.

O endpoint `GET http://localhost:3000/api/status` verifica a conexão com o banco e retorna o status da aplicação.
As perguntas podem ser consultadas em `GET /api/perguntas`, que nunca retorna o
gabarito. O cadastro via `POST /api/perguntas` exige o cabeçalho
`X-Question-Admin-Token`, configurado pela variável secreta
`QUESTION_ADMIN_TOKEN`, além de respeitar as etapas escolares e os níveis
estruturais válidos.

### 3. Configure o endereço do backend no frontend

Copie `frontend/.env.example` para `frontend/.env`. Configure `EXPO_PUBLIC_SERVER_URL` com o endereço do backend:

- **Navegador no mesmo computador:** `http://localhost:3000`
- **Celular na mesma rede Wi-Fi:** `http://<IP-LOCAL-DO-COMPUTADOR>:3000`

No Windows, descubra o IP local executando `ipconfig`. O IP precisa ser alcançável pelo dispositivo; confira também as regras do firewall se a conexão falhar. Reinicie o Expo após alterar o arquivo `.env`.

Variáveis `EXPO_PUBLIC_*` são incluídas no aplicativo e podem ser vistas por quem o utiliza. Use-as somente para configurações públicas, nunca para senhas ou outros segredos.

Backups locais de banco de dados não devem ser enviados ao Git: podem conter dados pessoais ou informações de acesso. Os arquivos `database/backup*.sql` são ignorados.

## Executar localmente

Mantenha os dois processos em execução, cada um no seu terminal:

### Terminal 1 — backend

```bash
cd backend
node server.js
```

O servidor usa a porta `3000` por padrão (ou o valor de `PORT`).

### Terminal 2 — frontend

```bash
cd frontend
npx expo start
```

- Para jogar no navegador, pressione `w` no terminal do Expo.
- Para jogar em um celular, abra o Expo Go e leia o QR code exibido pelo Expo. O celular e o computador precisam estar na mesma rede, e o `SERVER_URL` deve apontar para o IP local do computador.

## Testes e validações

### Testes do backend

```bash
cd backend
npm test
```

### Verificação de tipos do frontend

```bash
cd frontend
npx tsc --noEmit
```

### Build web do frontend

```bash
cd frontend
npm run build:web
```

### Lint do frontend

```bash
cd frontend
npm run lint
```

### Validação completa (PowerShell, na raiz do repositório)

```powershell
Push-Location backend; npm test; Pop-Location; Push-Location frontend; npx tsc --noEmit; npm run lint; Pop-Location; git diff --check
```

## Deploy atual e piloto

O piloto publicado utiliza:

- **Aiven:** MySQL com o schema e seed de `database/schema_e_seed.sql`.
- **Render:** Web Service Node.js executando o backend Socket.IO.
- **Vercel:** export estático do frontend web Expo.

Frontend publicado:

<https://jogoinclusaoufrrj.vercel.app/>

O deploy atual é adequado para grupos pequenos. O backend mantém salas e
partidas em memória; reinício ou novo deploy encerra partidas ativas. Consulte
[`docs/ARQUITETURA_E_OPERACAO.md`](docs/ARQUITETURA_E_OPERACAO.md) antes de
configurar múltiplas instâncias.

### Aiven

Crie um banco MySQL e importe o schema/seed usando um cliente MySQL local. Use os dados exibidos pelo Aiven para preencher `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.

No Render, mantenha `DB_SSL=true`. Para não salvar certificado no repositório, informe o CA como variável `DB_CA_CERT`, preservando as quebras de linha como `\n`. `DB_CA_PATH=ca.pem` continua disponível para desenvolvimento local.

### Render

Configure o serviço com:

- **Root Directory:** `backend`
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/status`

Variáveis obrigatórias:

```text
PORT=10000
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
DB_SSL=true
DB_CA_CERT=...
CLIENT_ORIGIN=https://SEU-PROJETO.vercel.app
QUESTION_ADMIN_TOKEN=...
NODE_ENV=production
```

`QUESTION_ADMIN_TOKEN` deve ser um token forte, armazenado somente nas
variáveis secretas do Render. Não o inclua no frontend nem no repositório.
Em produção, `NODE_ENV=production` faz o backend exigir `CLIENT_ORIGIN`
explícito e rejeitar o curinga `*`.

O valor de `CLIENT_ORIGIN` pode conter uma lista separada por vírgulas quando houver mais de um domínio autorizado.

### Vercel

Configure o projeto com:

- **Root Directory:** `frontend`
- **Build Command:** `npm run build:web`
- **Output Directory:** `dist`

Variável obrigatória:

```text
EXPO_PUBLIC_SERVER_URL=https://SEU-BACKEND.onrender.com
```

Depois do deploy, valide `/api/status` no domínio do Render e faça uma partida
multiplayer com quatro sessões. Para operação contínua, configure
monitoramento externo do health check e mantenha `CLIENT_ORIGIN` restrito ao
domínio publicado.

## Teste manual multiplayer

1. Inicie o backend e o frontend.
2. Abra quatro sessões do app (por exemplo, quatro abas ou janelas).
3. Crie uma sala em uma sessão e use o código para conectar as outras três.
4. O anfitrião escolhe a etapa escolar e inicia a partida.
5. Confirme que apenas o jogador do turno atual vê **Rolar dado**.
6. Quando um jogador parar em uma casa-obstáculo, confirme que todos veem a pausa e deixam de ver o botão de rolagem.

## Banco de perguntas

O repositório inclui um `questionRepository` para consultar perguntas aleatórias
na tabela `perguntas` do banco configurado, filtradas por `etapa_escolar` e
`nivel_estrutural`. O fluxo de quiz está integrado à partida, com perguntas
individuais, prazo controlado pelo servidor, pontuação e retomada do turno. Não
inclua dados de acesso ao banco ou certificados no GitHub.

O protótipo usa `defaultdb` como banco de aplicação confirmado no Aiven, hoje
populado com **27 perguntas únicas balanceadas** (3 para cada uma das 9
combinações de etapa escolar e nível estrutural) a partir de
`database/schema_e_seed.sql` e `database/perguntas_expansao.sql` (ambos
idempotentes contra inserções duplicadas). A revisão pedagógica com professores,
ampliação futura do acervo e a migração de provedor antes do encerramento do
Aiven Free Tier (2026-12-21) seguem no roadmap.

## Limitações e próximos passos

O MVP ainda precisa de recuperação após reinício, validação em dispositivo
móvel, testes de acessibilidade, revisão da matriz pedagógica e mais perguntas. Não implemente login Google, ranking ou histórico sem antes
definir identidade, consentimento e política de dados.

Consulte [`docs/ROADMAP.md`](docs/ROADMAP.md) para a sequência recomendada.