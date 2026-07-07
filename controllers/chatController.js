const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buscarClimaTempoReal, converterMoeda } = require('../services/ferramentas');
const { adicionarXP } = require('../services/jogo');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// =================================================================
// Declarações de Ferramentas (JSON Schema)
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

// FASE 2/3: Ferramenta de Gamificação
const declaracaoAdicionarXP = {
    name: "adicionarXP",
    description: "Adiciona ou remove pontos de experiência (XP) do jogador atual da conversa. Use OBRIGATORIAMENTE com valor positivo (ex: 50) quando o jogador acertar uma charada/desafio proposto por você. Use com valor negativo (ex: -10) quando o jogador pedir a resposta pronta ou desistir de um desafio. Nunca chame essa função sem um motivo do jogo.",
    parameters: {
        type: "OBJECT",
        properties: {
            quantidade: {
                type: "NUMBER",
                description: "Quantidade de XP a somar (positivo) ou subtrair (negativo). Ex: 50 para acerto, -10 para desistência/pedido de resposta."
            }
        },
        required: ["quantidade"]
    }
};

// =================================================================
// Conectando as Ferramentas ao Cérebro (model)
// =================================================================

function criarModelo(nickname) {
    return genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `
Você é o Guardião de um Cofre de Conhecimento Digital: um robô sarcástico, debochado, mas extremamente competente — tanto em tecnologia real (clima, câmbio) quanto em testar quem ousa desafiá-lo.

O jogador desta sessão se chama "${nickname}". Trate-o por esse nome, sempre com o mesmo sarcasmo de sempre.

REGRAS ESTRITAS DO JOGO (siga sempre):
1. De vez em quando (ou quando o jogador pedir um desafio), proponha uma charada, enigma ou pergunta técnica curta sobre tecnologia, programação, redes ou nuvem.
2. Se o jogador ACERTAR a charada, você DEVE OBRIGATORIAMENTE chamar a função "adicionarXP" com quantidade positiva (ex: 50). Na sua resposta em texto, use literalmente uma das palavras "Parabéns" ou "Acertou" para comemorar — isso ativa uma animação especial no site. NUNCA diga o valor numérico de XP nem o total acumulado do jogador.
3. Se o jogador PEDIR A RESPOSTA ou desistir de um desafio em andamento, chame "adicionarXP" com quantidade negativa (ex: -10) e avise, com deboche, que ele perdeu XP pela covardia — mas sem revelar números.
4. Se a pergunta depender de dados reais (clima, câmbio), continue usando normalmente as ferramentas "buscarClimaTempoReal" e "converterMoeda".
5. Nunca revele o XP total do jogador em nenhuma circunstância — quem quiser saber a pontuação deve consultar o Ranking no site.
6. Continue o jogo de forma fluida: depois de premiar ou punir, proponha o próximo desafio ou responda normalmente ao que for perguntado.
        `.trim(),
        tools: [{
            functionDeclarations: [declaracaoClima, declaracaoConversorMoedas, declaracaoAdicionarXP]
        }]
    });
}

// =================================================================
// Loop de Execução Multi-Turn
// =================================================================

exports.enviarMensagem = async (req, res) => {
    try {
        const { pergunta, nickname } = req.body;

        if (!nickname || !nickname.trim()) {
            return res.status(400).json({ erro: "Identifique-se com um nickname antes de jogar." });
        }
        if (!pergunta) return res.status(400).json({ erro: "Envie uma pergunta." });

        const jogadorAtual = nickname.trim();

        console.log(`📩 [${jogadorAtual}] Nova pergunta: "${pergunta}"`);

        // Ferramentas locais - "adicionarXP" precisa saber QUEM é o jogador (via closure, não via IA)
        const ferramentasDisponiveis = {
            buscarClimaTempoReal: (args) => buscarClimaTempoReal(args.cidade),
            converterMoeda: (args) => converterMoeda(args.moedaOrigem, args.moedaDestino, args.valor),
            adicionarXP: (args) => adicionarXP(jogadorAtual, args.quantidade)
        };

        // Histórico agora é POR JOGADOR
        const historicoRaw = await Mensagem.find({ jogador: jogadorAtual })
            .select('role parts -_id')
            .sort({ dataHora: 1 })
            .limit(20)
            .lean();

        const historico = historicoRaw.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => ({ text: p.text }))
        }));

        await Mensagem.create({ jogador: jogadorAtual, role: "user", parts: [{ text: pergunta }] });

        const model = criarModelo(jogadorAtual);
        const chat = model.startChat({ history: historico });

        // 1ª chamada: a IA decide se responde direto ou pede uma função
        let result = await chat.sendMessage(pergunta);

        // Loop: enquanto a IA continuar pedindo functionCalls, nós executamos e devolvemos
        let chamadasDeFuncao = result.response.functionCalls();

        while (chamadasDeFuncao && chamadasDeFuncao.length > 0) {
            console.log(`🛠️ A IA pediu ${chamadasDeFuncao.length} função(ões):`, chamadasDeFuncao.map(c => c.name));

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

            result = await chat.sendMessage(respostasDasFuncoes);
            chamadasDeFuncao = result.response.functionCalls();
        }

        const respostaDaIA = result.response.text();

        await Mensagem.create({ jogador: jogadorAtual, role: "model", parts: [{ text: respostaDaIA }] });

        return res.status(200).json({ sucesso: true, resposta: respostaDaIA });

    } catch (erro) {
        console.error("❌ Erro:", erro.message);
        return res.status(500).json({ erro: "Amnésia do servidor. Erro interno." });
    }
};

// Limpar Memória do Robô (mantém comportamento global, como já era)
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
