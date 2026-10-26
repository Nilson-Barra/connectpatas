'use strict';

const fs = require('fs');
const path = require('path');

// Fotos dos animais da massa de demonstração (créditos em fotos/CREDITOS.md).
// Os arquivos já estão reduzidos e em WebP, como o envio pela tela deixaria.
// Cada arquivo tem o nome do animal sem acento: Paçoca é fotos/pacoca.webp.
const PASTA = path.join(__dirname, 'fotos');
const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

module.exports = {
  async up(queryInterface) {
    const [animais] = await queryInterface.sequelize.query('SELECT id, nome FROM animal');
    const agora = new Date();

    for (const { id, nome } of animais) {
      const arquivo = path.join(PASTA, `${semAcento(nome)}.webp`);
      if (!fs.existsSync(arquivo)) continue;
      await queryInterface.bulkInsert('foto_animal', [{
        id_animal: id,
        tipo: 'image/webp',
        dados: fs.readFileSync(arquivo),
        created_at: agora,
        updated_at: agora,
      }]);
      await queryInterface.sequelize.query(
        'UPDATE animal SET fotografia = :url WHERE id = :id',
        { replacements: { url: `/api/animais/${id}/foto?v=${agora.getTime()}`, id } }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('foto_animal', null, {});
    await queryInterface.sequelize.query('UPDATE animal SET fotografia = NULL');
  },
};
