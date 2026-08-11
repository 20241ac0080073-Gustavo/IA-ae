const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { upload, tratarErroDeUpload } = require('../middlewares/upload');
const { verificarToken } = require('../middlewares/auth');

router.post('/', chatController.enviarMensagem);
router.get('/historico', chatController.buscarHistorico); // Histórico Rico (F5)
router.post('/vision', verificarToken, upload.single('imagem'), tratarErroDeUpload, chatController.enviarMensagemComImagem);
router.delete('/limpar', chatController.limparHistorico); // Rota do Botão de Limpar

module.exports = router;