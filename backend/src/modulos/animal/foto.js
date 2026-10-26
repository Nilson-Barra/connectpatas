const sharp = require('sharp');
const { erro } = require('../../comum/erros');

// Tratamento da foto enviada pela ONG (RF03).
//
// Nada do que chega é guardado como veio: a imagem é decodificada e gravada de
// novo em WebP, com no máximo 800 px. Isso deixa o arquivo leve, descarta os
// metadados (a localização do GPS que o celular grava na foto, por exemplo) e
// garante que o que fica no banco é uma imagem de verdade, não um arquivo
// qualquer com nome de .jpg.

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const LIMITE_BYTES = 5 * 1024 * 1024;
const LADO_MAXIMO = 800;
// Uma imagem de 5 MB comprimida pode virar centenas de MB na memória ao ser
// aberta. Acima de 40 milhões de pixels (8000 x 5000), recusa antes de abrir.
const LIMITE_PIXELS = 40_000_000;

// Assinatura dos primeiros bytes de cada formato aceito. O tipo declarado no
// envio é só uma etiqueta; quem diz o que o arquivo é são estes bytes.
function formatoReal(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

async function processar(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) {
    throw erro.requisicao('Envie a foto como arquivo JPG, PNG ou WebP.');
  }
  if (buf.length > LIMITE_BYTES) throw erro.requisicao('A foto pode ter no máximo 5 MB.');
  if (!formatoReal(buf)) {
    throw erro.requisicao('O arquivo não é uma imagem JPG, PNG ou WebP.');
  }
  try {
    const dados = await sharp(buf, { limitInputPixels: LIMITE_PIXELS, failOn: 'error' })
      .rotate() // respeita a orientação de quem tirou a foto com o celular
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return { dados, tipo: 'image/webp' };
  } catch {
    throw erro.requisicao('Não foi possível ler esta imagem. Tente outra foto.');
  }
}

module.exports = { processar, formatoReal, TIPOS, LIMITE_BYTES };
