# Ludo Equidade

Jogo multiplayer de tabuleiro sobre inclusão e acessibilidade, desenvolvido com Expo/React Native no frontend e Node.js, Express e Socket.IO no backend.

## Funcionalidades

- Criação de salas e entrada por código.
- Partidas para 4 a 8 participantes, com um anfitrião que escolhe a etapa escolar.
- Tabuleiro compartilhado com posições de 0 a 20, turnos, rodadas e lançamento de dado.
- Condição atribuída individualmente a cada participante.
- Pausa coletiva quando alguém para nas casas-obstáculo 4, 8, 12 ou 16.

**Estado atual:** a interface e o motor do jogo implementam sala, turnos, movimento e pausa nos obstáculos. A pausa ainda aguarda a futura integração do quiz; a partida não é retomada automaticamente após uma pergunta.

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

### 3. Configure o endereço do backend no frontend

Copie `frontend/.env.example` para `frontend/.env`. Configure `EXPO_PUBLIC_SERVER_URL` com o endereço do backend:

- **Navegador no mesmo computador:** `http://localhost:3000`
- **Celular na mesma rede Wi-Fi:** `http://<IP-LOCAL-DO-COMPUTADOR>:3000`

No Windows, descubra o IP local executando `ipconfig`. O IP precisa ser alcançável pelo dispositivo; confira também as regras do firewall se a conexão falhar. Reinicie o Expo após alterar o arquivo `.env`.

Variáveis `EXPO_PUBLIC_*` são incluídas no aplicativo e podem ser vistas por quem o utiliza. Use-as somente para configurações públicas, nunca para senhas ou outros segredos.

Backups locais de banco de dados não devem ser enviados ao Git: podem conter dados pessoais ou informações de acesso. Os arquivos `database/backup*.sql` são ignorados.

## Executar localmente

Mantenha os dois processos em execução, cada um no seu terminal:

**Terminal 1 — backend**

```bash
cd backend
node server.js
```

O servidor usa a porta `3000` por padrão (ou o valor de `PORT`).

**Terminal 2 — frontend**

```bash
cd frontend
npx expo start
```

- Para jogar no navegador, pressione `w` no terminal do Expo.
- Para jogar em um celular, abra o Expo Go e leia o QR code exibido pelo Expo. O celular e o computador precisam estar na mesma rede, e o `SERVER_URL` deve apontar para o IP local do computador.

## Testes e validações

**Testes do backend**

```bash
cd backend
npm test
```

**Verificação de tipos do frontend**

```bash
cd frontend
npx tsc --noEmit
```

**Lint do frontend**

```bash
cd frontend
npm run lint
```

## Teste manual multiplayer

1. Inicie o backend e o frontend.
2. Abra quatro sessões do app (por exemplo, quatro abas ou janelas).
3. Crie uma sala em uma sessão e use o código para conectar as outras três.
4. O anfitrião escolhe a etapa escolar e inicia a partida.
5. Confirme que apenas o jogador do turno atual vê **Rolar dado**.
6. Quando um jogador parar em uma casa-obstáculo, confirme que todos veem a pausa e deixam de ver o botão de rolagem.

## Banco de perguntas

O repositório inclui um `questionRepository` para consultar perguntas aleatórias em `ludo_equidade.perguntas`, filtradas por `etapa_escolar` e `nivel_estrutural`. A integração do fluxo de quiz com a partida ainda está pendente. Não inclua dados de acesso ao banco ou certificados no GitHub.