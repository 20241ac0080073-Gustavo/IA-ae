// 1. Importações (Bibliotecas)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require('mongoose');

// 2. Configurações Iniciais do Servidor
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// 3. Conexão com o Banco de Dados
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Conectado ao MongoDB Atlas!'))
  .catch((err) => console.error('❌ Erro no banco:', err));

// 4. Schema e Model do Banco
const MensagemSchema = new mongoose.Schema({
    role: String,
    parts: [{ text: String }],
    dataHora: { type: Date, default: Date.now }
});
const Mensagem = mongoose.model('Mensagem', MensagemSchema);

// 5. Configuração da IA
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// 6. ROTA (Endpoint) DA API ← REFATORADA COM MEMÓRIA
app.post('/api/chat', async (req, res) => {
    try {
        const { pergunta } = req.body;
        if (!pergunta) return res.status(400).json({ erro: "Envie uma pergunta." });

        console.log(`📩 Nova pergunta recebida: "${pergunta}"`);

        // 1. Salva a pergunta do usuário no Banco de Dados
        await Mensagem.create({ role: "user", parts: [{ text: pergunta }] });

        // 2. Busca o histórico (últimas 20 mensagens), sem _id e dataHora
        const historico = await Mensagem.find()
                                        .select('role parts -_id')
                                        .sort({ dataHora: 1 })
                                        .limit(20);

        // 3. Inicia o chat com o histórico e a personalidade do robô
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "Você é um robô sarcástico." // ← Personalidade preservada!
        });

        const chat = model.startChat({
            history: historico // O Gemini lê isso e "lembra" do que conversaram
        });

        // 4. Manda a nova pergunta para a IA
        const result = await chat.sendMessage(pergunta);
        const respostaDaIA = result.response.text();

        // 5. Salva a resposta da IA no Banco para uso futuro
        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        // 6. Devolve a resposta para o Front-end
        return res.status(200).json({ sucesso: true, resposta: respostaDaIA });

    } catch (erro) {
        console.error("❌ Erro:", erro);
        return res.status(500).json({ erro: "Amnésia do servidor. Erro interno." });
    }
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});