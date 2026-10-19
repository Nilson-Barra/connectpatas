const { DataTypes, Model } = require('sequelize');

// ResponsavelOng, VoluntarioOng e Adotante especializam Usuario:
// a chave primária é a própria FK para usuario.id (herança da Figura 1).
module.exports = (sequelize) => {
  const vinculadoAOng = (nome, tabela) => {
    class Perfil extends Model {}
    Perfil.init(
      {
        idUsuario: { type: DataTypes.INTEGER, primaryKey: true },
        idOng: { type: DataTypes.INTEGER, allowNull: false },
      },
      { sequelize, modelName: nome, tableName: tabela }
    );
    Perfil.associate = (m) => {
      Perfil.belongsTo(m.Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
      Perfil.belongsTo(m.Ong, { foreignKey: 'idOng', as: 'ong' });
    };
    return Perfil;
  };

  const ResponsavelOng = vinculadoAOng('ResponsavelOng', 'responsavel_ong');
  const VoluntarioOng = vinculadoAOng('VoluntarioOng', 'voluntario_ong');

  class Adotante extends Model {}
  Adotante.init(
    {
      idUsuario: { type: DataTypes.INTEGER, primaryKey: true },
      telefone: { type: DataTypes.STRING(20), allowNull: true },
      infoAdocao: { type: DataTypes.TEXT, allowNull: true },
    },
    { sequelize, modelName: 'Adotante', tableName: 'adotante' }
  );
  Adotante.associate = (m) => {
    Adotante.belongsTo(m.Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
    Adotante.hasMany(m.SolicitacaoAdocao, { foreignKey: 'idAdotante', as: 'solicitacoes' });
  };

  return { ResponsavelOng, VoluntarioOng, Adotante };
};
