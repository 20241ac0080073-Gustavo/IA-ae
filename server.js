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

// 6. ROTA (Endpoint) DA API
app.post('/api/chat', async (req, res) => {
    try {
        const { pergunta } = req.body;
        if (!pergunta) return res.status(400).json({ erro: "Envie uma pergunta." });

        console.log(`📩 Nova pergunta recebida: "${pergunta}"`);

        // 1. Busca o histórico ANTES de salvar
        const historicoRaw = await Mensagem.find()
                                        .select('role parts -_id')
                                        .sort({ dataHora: 1 })
                                        .limit(20)
                                        .lean();

        // 2. Limpa o formato para o Gemini aceitar (só role e parts)
        const historico = historicoRaw.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => ({ text: p.text }))
        }));

        console.log("📚 Histórico enviado ao Gemini:", JSON.stringify(historico, null, 2));

        // 3. Salva a pergunta DEPOIS de pegar o histórico
        await Mensagem.create({ role: "user", parts: [{ text: pergunta }] });

        // 4. Inicia o chat com o histórico
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: "Você é um robô sarcástico."
        });

        const chat = model.startChat({ history: historico });

        // 5. Manda a nova pergunta
        const result = await chat.sendMessage(pergunta);
        const respostaDaIA = result.response.text();

        // 6. Salva a resposta da IA
        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        return res.status(200).json({ sucesso: true, resposta: respostaDaIA });

    } catch (erro) {
        console.error("❌ Erro completo:", JSON.stringify(erro, null, 2));
        console.error("❌ Mensagem:", erro.message);
        console.error("❌ Stack:", erro.stack);
        return res.status(500).json({ erro: "Amnésia do servidor. Erro interno." });
    }
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});