const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Função para enviar pergunta
exports.enviarMensagem = async (req, res) => {
    try {
        const { pergunta } = req.body;
        if (!pergunta) return res.status(400).json({ erro: "Envie uma pergunta." });

        console.log(`📩 Nova pergunta: "${pergunta}"`);

        const historicoRaw = await Mensagem.find()
            .select('role parts -_id')
            .sort({ dataHora: 1 })
            .limit(20)
            .lean();

        const historico = historicoRaw.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => ({ text: p.text }))
        }));

        await Mensagem.create({ role: "user", parts: [{ text: pergunta }] });

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: "Você é um robô sarcástico."
        });

        const chat = model.startChat({ history: historico });
        const result = await chat.sendMessage(pergunta);
        const respostaDaIA = result.response.text();

        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        return res.status(200).json({ sucesso: true, resposta: respostaDaIA });

    } catch (erro) {
        console.error("❌ Erro:", erro.message);
        return res.status(500).json({ erro: "Amnésia do servidor. Erro interno." });
    }
};

// Nova Função: Limpar Memória do Robô
exports.limparHistorico = async (req, res) => {
    try {
        await Mensagem.deleteMany({});
        console.log("🗑️ Memória do robô apagada com sucesso!");
        return res.status(200).json({ sucesso: true, mensagem: "Histórico limpo." });
    } catch (erro) {
        console.error("❌ Erro ao limpar histórico:", erro.message);
        return res.status(500).json({ erro: "Erro ao limpar a memória." });
    }
};