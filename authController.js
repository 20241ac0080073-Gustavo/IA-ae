// controllers/authController.js
// Login "minimalista": o jogo já identifica o jogador só pelo nickname
// (sem senha), então aqui apenas trocamos esse nickname por um JWT assinado.
// Isso é o suficiente para proteger a rota /api/chat/vision sem reescrever
// todo o sistema de identidade do jogo.

const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    try {
        const { nickname } = req.body;

        if (!nickname || !nickname.trim()) {
            return res.status(400).json({ erro: 'Informe um nickname para entrar.' });
        }

        const jogador = nickname.trim();

        const token = jwt.sign(
            { nickname: jogador },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        return res.status(200).json({ sucesso: true, token, nickname: jogador });
    } catch (erro) {
        console.error('❌ Erro no login:', erro.message);
        return res.status(500).json({ erro: 'Falha ao gerar o token de acesso.' });
    }
};
