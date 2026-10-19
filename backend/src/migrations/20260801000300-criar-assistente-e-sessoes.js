'use strict';

/**
 * Tabelas do assistente de cuidados (Seção 10.3) e a tabela de sessões.
 *
 * conversa_ia tem id_usuario e id_ong opcionais: o assistente atende
 * visitante não autenticado, decisão registrada na Seção 10.3.
 *
 * item_conhecimento ganha uma coluna tsvector mantida por gatilho, usada
 * pelo recuperador do agente (Seção 7.4). Buscar por significado exige
 * pgvector; a busca textual nativa resolve o escopo do MVP.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('item_conhecimento', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_ong: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ong', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      titulo: { type: Sequelize.STRING(160), allowNull: false },
      categoria: {
        type: Sequelize.ENUM('Saúde', 'Vacinação', 'Alimentação', 'Comportamento', 'Adoção'),
        allowNull: false,
      },
      conteudo: { type: Sequelize.TEXT, allowNull: false },
      termos: { type: Sequelize.TEXT, allowNull: true },
      // RNF15: sem fonte e sem responsável, o item não entra.
      fonte: { type: Sequelize.STRING(255), allowNull: false },
      validado_por: { type: Sequelize.STRING(120), allowNull: false },
      validado_em: { type: Sequelize.DATEONLY, allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('item_conhecimento', ['id_ong', 'ativo']);

    await queryInterface.sequelize.query(`
      ALTER TABLE item_conhecimento ADD COLUMN busca tsvector
        GENERATED ALWAYS AS (
          setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce(termos, '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce(conteudo, '')), 'B')
        ) STORED;
    `);
    await queryInterface.sequelize.query(
      'CREATE INDEX item_conhecimento_busca_idx ON item_conhecimento USING GIN (busca);'
    );

    await queryInterface.createTable('conversa_ia', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuario', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      id_ong: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ong', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      iniciada_em: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM('Aberta', 'Encerrada'),
        allowNull: false,
        defaultValue: 'Aberta',
      },
      escalada_para_ong: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('conversa_ia', ['id_ong', 'escalada_para_ong']);

    await queryInterface.createTable('mensagem_ia', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_conversa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'conversa_ia', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      origem: { type: Sequelize.ENUM('usuario', 'agente', 'ong'), allowNull: false },
      conteudo: { type: Sequelize.TEXT, allowNull: false },
      // RNF12: a resposta do agente guarda de onde veio e o quanto se sustenta.
      fontes: { type: Sequelize.TEXT, allowNull: true },
      confianca: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
      enviada_em: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('mensagem_ia', ['id_conversa']);

    // Sessões ficam no banco: o cookie carrega só o identificador,
    // e o logout apaga a linha de verdade.
    await queryInterface.createTable('sessao', {
      sid: { type: Sequelize.STRING(36), primaryKey: true },
      expires: { type: Sequelize.DATE },
      data: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sessao');
    await queryInterface.dropTable('mensagem_ia');
    await queryInterface.dropTable('conversa_ia');
    await queryInterface.dropTable('item_conhecimento');
    const tipos = [
      'enum_item_conhecimento_categoria',
      'enum_conversa_ia_status',
      'enum_mensagem_ia_origem',
    ];
    for (const t of tipos) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${t}";`);
    }
  },
};
