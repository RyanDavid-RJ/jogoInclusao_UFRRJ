require('dotenv').config();
const mysql = require('mysql2/promise');

async function testar() {
  try {
    const conexao = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    console.log('✅ Conexão bem-sucedida!');
    await conexao.end();
  } catch (erro) {
    console.error('❌ Falha na conexão:', erro.message);
  }
}
testar();