'use strict';

/**
 * Animal, solicitacao_adocao e mensagem.
 *
 * solicitacao_adocao é a entidade associativa que resolve o N:N entre
 * animal e adotante (Seção 7.1). Os valores dos enums vêm do diagrama
 * de máquina de estados (Figura 8) — manter os dois em sincronia.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('animal', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_ong: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ong', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      nome: { type: Sequelize.STRING(80), allowNull: false },
      especie: { type: Sequelize.ENUM('Canina', 'Felina', 'Outra'), allowNull: false },
      raca: { type: Sequelize.STRING(40), allowNull: true },
      idade: { type: Sequelize.STRING(40), allowNull: true },
      porte: { type: Sequelize.ENUM('Pequeno', 'Médio', 'Grande'), allowNull: true },
      condicao_saude: { type: Sequelize.STRING(255), allowNull: true },
      caracteristicas: { type: Sequelize.TEXT, allowNull: true },
      fotografia: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.ENUM('Disponível', 'Em processo de adoção', 'Adotado'),
        allowNull: false,
        defaultValue: 'Disponível',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('animal', ['id_ong']);
    await queryInterface.addIndex('animal', ['status']);

    await queryInterface.createTable('solicitacao_adocao', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_animal: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'animal', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      id_adotante: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'adotante', key: 'id_usuario' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      data_solicitacao: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('Pendente', 'Em análise', 'Aprovada', 'Concluída', 'Recusada'),
        allowNull: false,
        defaultValue: 'Pendente',
      },
      etapa: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      telefone_contato: { type: Sequelize.STRING(20), allowNull: true },
      moradia: { type: Sequelize.STRING(120), allowNull: true },
      outros_animais: { type: Sequelize.STRING(180), allowNull: true },
      disponibilidade: { type: Sequelize.STRING(120), allowNull: true },
      observacoes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('solicitacao_adocao', ['id_animal']);
    await queryInterface.addIndex('solicitacao_adocao', ['id_adotante']);
    await queryInterface.addIndex('solicitacao_adocao', ['status']);

    // Regra de negócio do UC05: um mesmo adotante não abre duas
    // solicitações para o mesmo animal. O banco é a última linha de defesa.
    await queryInterface.addConstraint('solicitacao_adocao', {
      fields: ['id_animal', 'id_adotante'],
      type: 'unique',
      name: 'solicitacao_unica_por_animal_e_adotante',
    });

    await queryInterface.createTable('mensagem', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_solicitacao: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'solicitacao_adocao', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      id_remetente: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuario', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      id_destinatario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuario', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      conteudo: { type: Sequelize.TEXT, allowNull: false },
      data_envio: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('mensagem', ['id_solicitacao']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mensagem');
    await queryInterface.dropTable('solicitacao_adocao');
    await queryInterface.dropTable('animal');
    const tipos = [
      'enum_animal_especie',
      'enum_animal_porte',
      'enum_animal_status',
      'enum_solicitacao_adocao_status',
    ];
    for (const t of tipos) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${t}";`);
    }
  },
};
