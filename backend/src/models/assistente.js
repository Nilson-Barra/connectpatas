const { DataTypes, Model } = require('sequelize');

const CATEGORIAS = ['Saúde', 'Vacinação', 'Alimentação', 'Comportamento', 'Adoção'];

module.exports = (sequelize) => {
  class ItemConhecimento extends Model {}
  ItemConhecimento.init(
    {
      idOng: { type: DataTypes.INTEGER, allowNull: false },
      titulo: { type: DataTypes.STRING(160), allowNull: false,
        validate: { notEmpty: { msg: 'Informe o título do item.' } } },
      categoria: { type: DataTypes.ENUM(...CATEGORIAS), allowNull: false },
      conteudo: { type: DataTypes.TEXT, allowNull: false,
        validate: { notEmpty: { msg: 'Informe o conteúdo do item.' } } },
      termos: { type: DataTypes.TEXT, allowNull: true },
      // RNF15: fonte e responsável são obrigatórios, não recomendação.
      fonte: { type: DataTypes.STRING(255), allowNull: false,
        validate: { notEmpty: { msg: 'Todo item precisa indicar a fonte.' } } },
      validadoPor: { type: DataTypes.STRING(120), allowNull: false,
        validate: { notEmpty: { msg: 'Informe quem validou o item.' } } },
      validadoEm: { type: DataTypes.DATEONLY, allowNull: false },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { sequelize, modelName: 'ItemConhecimento', tableName: 'item_conhecimento' }
  );
  ItemConhecimento.CATEGORIAS = CATEGORIAS;
  ItemConhecimento.associate = (m) => {
    ItemConhecimento.belongsTo(m.Ong, { foreignKey: 'idOng', as: 'ong' });
  };

  class ConversaIa extends Model {}
  ConversaIa.init(
    {
      idUsuario: { type: DataTypes.INTEGER, allowNull: true },
      idOng: { type: DataTypes.INTEGER, allowNull: true },
      iniciadaEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      status: { type: DataTypes.ENUM('Aberta', 'Encerrada'), allowNull: false,
        defaultValue: 'Aberta' },
      escaladaParaOng: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { sequelize, modelName: 'ConversaIa', tableName: 'conversa_ia' }
  );
  ConversaIa.associate = (m) => {
    ConversaIa.belongsTo(m.Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
    ConversaIa.belongsTo(m.Ong, { foreignKey: 'idOng', as: 'ong' });
    ConversaIa.hasMany(m.MensagemIa, { foreignKey: 'idConversa', as: 'mensagens' });
  };

  class MensagemIa extends Model {}
  MensagemIa.init(
    {
      idConversa: { type: DataTypes.INTEGER, allowNull: false },
      origem: { type: DataTypes.ENUM('usuario', 'agente', 'ong'), allowNull: false },
      conteudo: { type: DataTypes.TEXT, allowNull: false },
      fontes: { type: DataTypes.TEXT, allowNull: true },
      confianca: { type: DataTypes.DECIMAL(3, 2), allowNull: true },
      enviadaEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'MensagemIa', tableName: 'mensagem_ia' }
  );
  MensagemIa.associate = (m) => {
    MensagemIa.belongsTo(m.ConversaIa, { foreignKey: 'idConversa', as: 'conversa' });
  };

  return { ItemConhecimento, ConversaIa, MensagemIa };
};
