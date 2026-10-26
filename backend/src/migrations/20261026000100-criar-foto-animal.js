'use strict';

/**
 * Foto do animal (RF03).
 *
 * O campo animal.fotografia já existia no DER; ele passa a guardar o endereço
 * da foto na própria API (/api/animais/:id/foto?v=...). Os bytes ficam nesta
 * tabela, e não em disco: o plano gratuito dos serviços de hospedagem apaga
 * arquivos soltos a cada nova publicação, e a foto sumiria junto.
 *
 * Uma foto por animal, já reduzida para 800 px em WebP (dezenas de KB), então
 * o espaço do banco gratuito aguenta com folga.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('foto_animal', {
      id_animal: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'animal', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tipo: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'image/webp' },
      dados: { type: Sequelize.BLOB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('foto_animal');
  },
};
