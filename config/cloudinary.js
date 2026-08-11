// config/cloudinary.js
// Configuração do Object Storage (Cloudinary) - Fase 1

const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Faz o upload de um buffer (imagem em memória, vinda do multer) para o Cloudinary
 * usando um stream, sem nunca gravar nada no disco local do servidor.
 * @param {Buffer} buffer - Buffer da imagem recebida pelo multer.memoryStorage()
 * @param {string} nomePasta - Pasta no Cloudinary onde a imagem será organizada
 * @returns {Promise<string>} URL segura (https) da imagem hospedada
 */
function uploadBufferParaCloudinary(buffer, nomePasta = 'olho-de-rapina') {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: nomePasta,
                resource_type: 'image'
            },
            (erro, resultado) => {
                if (erro) return reject(erro);
                resolve(resultado.secure_url);
            }
        );

        stream.end(buffer);
    });
}

module.exports = { cloudinary, uploadBufferParaCloudinary };
