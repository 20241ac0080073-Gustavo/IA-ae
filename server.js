require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Importando Rotas
const chatRoutes = require('./routes/chatRoutes');
const rankingRoutes = require('./routes/rankingRoutes');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname)); // Mantém a conexão com o seu index.html

// Conexão com o Banco de Dados
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Conectado ao MongoDB Atlas!'))
  .catch((err) => console.error('❌ Erro no banco:', err));

// Acoplando as Rotas
app.use('/api/chat', chatRoutes);
app.use('/api/ranking', rankingRoutes);

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});
