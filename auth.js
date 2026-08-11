// middlewares/auth.js
// Middleware mínimo de autenticação via JWT.
// Não faz login "de verdade" (sem senha) — apenas garante que quem chama
// a rota protegida já passou pelo /api/auth/login e possui um token válido,
// e usa o nickname que está DENTRO do token (não o que vier solto no body).

const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    const cabecalho = req.headers['authorization'];

    if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
        return res.status(401).json({ erro: 'Token ausente. Faça login em /api/auth/login antes de usar esta rota.' });
    }

    const token = cabecalho.split(' ')[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // Disponibiliza o nickname autenticado para os controllers seguintes
        req.jogador = payload.nickname;
        next();
    } catch (erro) {
        return res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
    }
}

module.exports = { verificarToken };
