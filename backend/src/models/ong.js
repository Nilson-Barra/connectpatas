const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Ong extends Model {}
  Ong.init(
    {
      nome: { type: DataTypes.STRING(120), allowNull: false,
        validate: { notEmpty: { msg: 'Informe o nome da ONG.' } } },
      cnpj: { type: DataTypes.STRING(18), allowNull: true, unique: true },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      contato: { type: DataTypes.STRING(60), allowNull: true },
      endereco: { type: DataTypes.STRING(180), allowNull: true },
      cidade: { type: DataTypes.STRING(80), allowNull: true },
    },
    { sequelize, modelName: 'Ong', tableName: 'ong' }
  );

  Ong.associate = (m) => {
    Ong.hasMany(m.Animal, { foreignKey: 'idOng', as: 'animais' });
    Ong.hasMany(m.ResponsavelOng, { foreignKey: 'idOng', as: 'responsaveis' });
    Ong.hasMany(m.VoluntarioOng, { foreignKey: 'idOng', as: 'voluntarios' });
    Ong.hasMany(m.ItemConhecimento, { foreignKey: 'idOng', as: 'itensConhecimento' });
  };

  return Ong;
};
