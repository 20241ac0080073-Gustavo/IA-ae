const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buscarClimaTempoReal, converterMoeda } = require('../services/ferramentas');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// =================================================================
// FASE 2: O Manual de Instruções (Declarations / JSON Schema)
// =================================================================

const declaracaoClima = {
    name: "buscarClimaTempoReal",
    description: "Obtém a temperatura exata e o clima atual de uma cidade. Use sempre que o usuário perguntar sobre o tempo, temperatura, se vai chover, ou se precisa de blusa de frio/guarda-chuva.",
    parameters: {
        type: "OBJECT",
        properties: {
            cidade: {
                type: "STRING",
                description: "O nome da cidade. Ex: Assis Chateaubriand, Curitiba, Tokyo, Londres, Paris."
            }
        },
        required: ["cidade"]
    }
};

const declaracaoConversorMoedas = {
    name: "converterMoeda",
    description: "Converte um valor de uma moeda para outra usando a cotação atual de mercado. Use sempre que o usuário perguntar sobre cotação, câmbio, ou quantos Reais/Dólares/Euros algo vale.",
    parameters: {
        type: "OBJECT",
        properties: {
            moedaOrigem: {
                type: "STRING",
                description: "Código da moeda de origem, em formato ISO de 3 letras. Ex: USD, EUR, BRL."
            },
            moedaDestino: {
                type: "STRING",
                description: "Código da moeda de destino, em formato ISO de 3 letras. Ex: USD, EUR, BRL."
            },
            valor: {
                type: "NUMBER",
                description: "Valor numérico que o usuário deseja converter."
            }
        },
        required: ["moedaOrigem", "moedaDestino", "valor"]
    }
};

// Mapa para executar a função local correspondente ao nome pedido pela IA
const ferramentasDisponiveis = {
    buscarClimaTempoReal: (args) => buscarClimaTempoReal(args.cidade),
    converterMoeda: (args) => converterMoeda(args.moedaOrigem, args.moedaDestino, args.valor)
};

// =================================================================
// FASE 3: Conectando as Ferramentas ao Cérebro (model)
// =================================================================

function criarModelo() {
    return genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "Você é um robô sarcástico, mas que também é extremamente competente em buscar informações reais quando precisa (clima e câmbio). Use as ferramentas disponíveis sempre que a pergunta do usuário depender de dados atuais.",
        tools: [{
            functionDeclarations: [declaracaoClima, declaracaoConversorMoedas]
        }]
    });
}

// =================================================================
// FASE 4: Loop de Execução Multi-Turn
// =================================================================

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

        const model = criarModelo();
        const chat = model.startChat({ history: historico });

        // 1ª chamada: a IA decide se responde direto ou pede uma função
        let result = await chat.sendMessage(pergunta);

        // Loop: enquanto a IA continuar pedindo functionCalls, nós executamos e devolvemos
        let chamadasDeFuncao = result.response.functionCalls();

        while (chamadasDeFuncao && chamadasDeFuncao.length > 0) {
            console.log(`🛠️ A IA pediu ${chamadasDeFuncao.length} função(ões):`, chamadasDeFuncao.map(c => c.name));

            // Executa cada função pedida (pode ser uma ou várias, ex: clima + câmbio juntos)
            const respostasDasFuncoes = await Promise.all(
                chamadasDeFuncao.map(async (chamada) => {
                    const funcaoLocal = ferramentasDisponiveis[chamada.name];

                    let resultadoFuncao;
                    if (funcaoLocal) {
                        resultadoFuncao = await funcaoLocal(chamada.args);
                    } else {
                        resultadoFuncao = { erro: true, mensagem: `Função "${chamada.name}" não existe.` };
                    }

                    return {
                        functionResponse: {
                            name: chamada.name,
                            response: resultadoFuncao
                        }
                    };
                })
            );

            // Envia o(s) resultado(s) de volta para o Gemini formular a resposta final
            result = await chat.sendMessage(respostasDasFuncoes);
            chamadasDeFuncao = result.response.functionCalls();
        }

        const respostaDaIA = result.response.text();

        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        return res.status(200).json({ sucesso: true, resposta: respostaDaIA });

    } catch (erro) {
        console.error("❌ Erro:", erro.message);
        return res.status(500).json({ erro: "Amnésia do servidor. Erro interno." });
    }
};

// Limpar Memória do Robô
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
