const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Criamos o servidor HTTP e acoplamos o Socket.io a ele
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite ligações de qualquer IP (útil para testes locais)
    methods: ["GET", "POST"]
  }
});

// Evento disparado sempre que um novo telemóvel se liga
io.on('connection', (socket) => {
  console.log('Novo jogador conectado! ID da sessão:', socket.id);

  // Evento disparado quando o jogador fecha a aplicação ou perde a internet
  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});