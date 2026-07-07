// services/jogo.js
// Aqui mora o "superpoder" que o Gemini pode acionar para premiar (ou punir) o jogador.

const Jogador = require('../models/Jogador');

/**
 * Fase 2 - Function Calling: adicionarXP
 * Procura o jogador pelo nickname. Se não existir, cria. Se existir, soma (ou subtrai) o XP.
 * @param {string} nickname - nome do jogador atual (vem da sessão do front-end, não da IA)
 * @param {number} quantidade - quanto XP somar (pode ser negativo)
 */
async function adicionarXP(nickname, quantidade) {
    try {
        if (!nickname) {
            return { erro: true, mensagem: "Nenhum jogador identificado nesta sessão." };
        }

        const qtd = Number(quantidade) || 0;

        let jogador = await Jogador.findOne({ nome: nickname });

        if (!jogador) {
            // Jogador ainda não existe -> cria já com o XP ganho (nunca negativo na criação)
            jogador = await Jogador.create({ nome: nickname, xp: Math.max(qtd, 0) });
        } else {
            jogador.xp += qtd;
            if (jogador.xp < 0) jogador.xp = 0; // XP nunca fica negativo
            await jogador.save();
        }

        console.log(`🎮 XP atualizado: ${jogador.nome} -> ${jogador.xp} (${qtd >= 0 ? '+' : ''}${qtd})`);

        // Retorno enxuto para a IA: ela NÃO deve revelar esse total ao jogador (regra do prompt)
        return { sucesso: true, variacao: qtd };
    } catch (erro) {
        console.error("❌ Erro ao adicionar XP:", erro.message);
        return { erro: true, mensagem: "Falha ao atualizar o XP no banco de dados." };
    }
}

module.exports = { adicionarXP };
