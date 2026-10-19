const { DataTypes, Model } = require('sequelize');

const STATUS = ['Pendente', 'Em análise', 'Aprovada', 'Concluída', 'Recusada'];
const ENCERRADAS = ['Concluída', 'Recusada'];

module.exports = (sequelize) => {
  class SolicitacaoAdocao extends Model {
    get encerrada() { return ENCERRADAS.includes(this.status); }
  }

  SolicitacaoAdocao.init(
    {
      idAnimal: { type: DataTypes.INTEGER, allowNull: false },
      idAdotante: { type: DataTypes.INTEGER, allowNull: false },
      dataSolicitacao: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.ENUM(...STATUS), allowNull: false, defaultValue: 'Pendente' },
      etapa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1,
        validate: { min: 1, max: 4 } },
      telefoneContato: { type: DataTypes.STRING(20), allowNull: true },
      moradia: { type: DataTypes.STRING(120), allowNull: true },
      outrosAnimais: { type: DataTypes.STRING(180), allowNull: true },
      disponibilidade: { type: DataTypes.STRING(120), allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
    },
    { sequelize, modelName: 'SolicitacaoAdocao', tableName: 'solicitacao_adocao' }
  );

  SolicitacaoAdocao.STATUS = STATUS;
  SolicitacaoAdocao.associate = (m) => {
    SolicitacaoAdocao.belongsTo(m.Animal, { foreignKey: 'idAnimal', as: 'animal' });
    SolicitacaoAdocao.belongsTo(m.Adotante, { foreignKey: 'idAdotante', as: 'adotante' });
    SolicitacaoAdocao.hasMany(m.Mensagem, { foreignKey: 'idSolicitacao', as: 'mensagens' });
  };

  class Mensagem extends Model {}
  Mensagem.init(
    {
      idSolicitacao: { type: DataTypes.INTEGER, allowNull: false },
      idRemetente: { type: DataTypes.INTEGER, allowNull: false },
      idDestinatario: { type: DataTypes.INTEGER, allowNull: false },
      conteudo: { type: DataTypes.TEXT, allowNull: false,
        validate: { notEmpty: { msg: 'A mensagem não pode ser vazia.' } } },
      dataEnvio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'Mensagem', tableName: 'mensagem' }
  );
  Mensagem.associate = (m) => {
    Mensagem.belongsTo(m.SolicitacaoAdocao, { foreignKey: 'idSolicitacao', as: 'solicitacao' });
    Mensagem.belongsTo(m.Usuario, { foreignKey: 'idRemetente', as: 'remetente' });
    Mensagem.belongsTo(m.Usuario, { foreignKey: 'idDestinatario', as: 'destinatario' });
  };

  return { SolicitacaoAdocao, Mensagem };
};
