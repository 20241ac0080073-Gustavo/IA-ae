const mongoose = require('mongoose');

const JogadorSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    xp: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Jogador', JogadorSchema);
