const Jogador = require('../models/Jogador');

// Desafio Hacker: título dinâmico baseado no XP
function calcularTitulo(xp, nome) {
    if (xp >= 500) return `Lenda: ${nome}`;
    if (xp < 100) return `Novato: ${nome}`;
    return nome;
}

exports.obterRanking = async (req, res) => {
    try {
        const jogadores = await Jogador.find()
            .sort({ xp: -1 })
            .limit(10)
            .lean();

        const ranking = jogadores.map((j, indice) => ({
            posicao: indice + 1,
            nome: j.nome,
            tituloExibido: calcularTitulo(j.xp, j.nome),
            xp: j.xp
        }));

        return res.status(200).json({ sucesso: true, ranking });
    } catch (erro) {
        console.error("❌ Erro ao buscar ranking:", erro.message);
        return res.status(500).json({ erro: "Erro ao buscar o ranking." });
    }
};
