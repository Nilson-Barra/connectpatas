'use strict';

/**
 * Tabela base de usuários e as três especializações de perfil,
 * conforme a herança de Usuario no diagrama de classes (Figura 1)
 * e o modelo físico da Figura 11.
 *
 * A chave primária de cada perfil é também chave estrangeira para
 * usuario.id — é o que torna a especialização 1:1.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuario', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      senha_hash: { type: Sequelize.STRING(255), allowNull: false },
      tipo_usuario: {
        type: Sequelize.ENUM('responsavel_ong', 'voluntario_ong', 'adotante'),
        allowNull: false,
      },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('usuario', ['tipo_usuario']);

    await queryInterface.createTable('ong', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING(120), allowNull: false },
      cnpj: { type: Sequelize.STRING(18), allowNull: true, unique: true },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      contato: { type: Sequelize.STRING(60), allowNull: true },
      endereco: { type: Sequelize.STRING(180), allowNull: true },
      cidade: { type: Sequelize.STRING(80), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    const perfilVinculadoAOng = (nome) =>
      queryInterface.createTable(nome, {
        id_usuario: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: { model: 'usuario', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        id_ong: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'ong', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

    await perfilVinculadoAOng('responsavel_ong');
    await perfilVinculadoAOng('voluntario_ong');

    await queryInterface.createTable('adotante', {
      id_usuario: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'usuario', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      telefone: { type: Sequelize.STRING(20), allowNull: true },
      info_adocao: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adotante');
    await queryInterface.dropTable('voluntario_ong');
    await queryInterface.dropTable('responsavel_ong');
    await queryInterface.dropTable('ong');
    await queryInterface.dropTable('usuario');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_usuario_tipo_usuario";');
  },
};
