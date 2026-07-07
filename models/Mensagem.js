const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    jogador: { type: String, required: true, index: true }, // NOVO: quem enviou a mensagem
    role: String,
    parts: [{ text: String }],
    dataHora: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mensagem', MensagemSchema);
