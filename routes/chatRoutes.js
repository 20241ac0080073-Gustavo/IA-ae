const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.enviarMensagem);
router.delete('/limpar', chatController.limparHistorico); // Rota do Botão de Limpar

module.exports = router;