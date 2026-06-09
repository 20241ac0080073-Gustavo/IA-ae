const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    role: String,
    parts: [{ text: String }],
    dataHora: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mensagem', MensagemSchema);