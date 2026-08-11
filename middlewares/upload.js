// middlewares/upload.js
// Fase 2: Multer configurado com memoryStorage.
// O Render apaga arquivos locais ao reiniciar, então NUNCA salvamos em disco:
// a imagem fica só em Buffer (RAM) até subirmos ela pro Cloudinary.

const multer = require('multer');

const armazenamento = multer.memoryStorage();

const TAMANHO_MAXIMO_MB = 5;

function filtroDeArquivo(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
        // Rejeita PDF, vídeo, etc. de forma controlada (vira erro 400 no controller/handler)
        return cb(new Error('TIPO_INVALIDO'));
    }
    cb(null, true);
}

const upload = multer({
    storage: armazenamento,
    limits: { fileSize: TAMANHO_MAXIMO_MB * 1024 * 1024 },
    fileFilter: filtroDeArquivo
});

// Middleware auxiliar: transforma erros do multer (arquivo grande, tipo inválido)
// em respostas 400 amigáveis, em vez de derrubar o servidor com um 500.
function tratarErroDeUpload(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ erro: `Arquivo muito grande. O limite é ${TAMANHO_MAXIMO_MB}MB.` });
        }
        return res.status(400).json({ erro: 'Falha no upload do arquivo.' });
    }
    if (err && err.message === 'TIPO_INVALIDO') {
        return res.status(400).json({ erro: 'Apenas arquivos de imagem são aceitos (jpg, png, webp, etc).' });
    }
    if (err) {
        return res.status(400).json({ erro: 'Não foi possível processar o arquivo enviado.' });
    }
    next();
}

module.exports = { upload, tratarErroDeUpload };
