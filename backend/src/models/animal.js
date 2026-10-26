const { DataTypes, Model } = require('sequelize');

const STATUS = ['Disponível', 'Em processo de adoção', 'Adotado'];

module.exports = (sequelize) => {
  class Animal extends Model {
    // Regra do UC04: só animal disponível aparece na consulta pública.
    get publico() { return this.status === 'Disponível'; }
  }

  Animal.init(
    {
      idOng: { type: DataTypes.INTEGER, allowNull: false },
      nome: { type: DataTypes.STRING(80), allowNull: false,
        validate: { notEmpty: { msg: 'Informe o nome do animal.' } } },
      especie: { type: DataTypes.ENUM('Canina', 'Felina', 'Outra'), allowNull: false },
      raca: { type: DataTypes.STRING(40), allowNull: true },
      idade: { type: DataTypes.STRING(40), allowNull: true },
      porte: { type: DataTypes.ENUM('Pequeno', 'Médio', 'Grande'), allowNull: true },
      condicaoSaude: { type: DataTypes.STRING(255), allowNull: true },
      caracteristicas: { type: DataTypes.TEXT, allowNull: true },
      fotografia: { type: DataTypes.STRING(255), allowNull: true },
      status: { type: DataTypes.ENUM(...STATUS), allowNull: false, defaultValue: 'Disponível' },
    },
    { sequelize, modelName: 'Animal', tableName: 'animal' }
  );

  // Os bytes da foto (RF03). Separados do animal para que listar animais não
  // arraste dezenas de KB por linha.
  class FotoAnimal extends Model {}
  FotoAnimal.init(
    {
      idAnimal: { type: DataTypes.INTEGER, primaryKey: true },
      tipo: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'image/webp' },
      dados: { type: DataTypes.BLOB, allowNull: false },
    },
    { sequelize, modelName: 'FotoAnimal', tableName: 'foto_animal' }
  );
  Animal.Foto = FotoAnimal;

  Animal.STATUS = STATUS;
  Animal.associate = (m) => {
    Animal.belongsTo(m.Ong, { foreignKey: 'idOng', as: 'ong' });
    Animal.hasMany(m.SolicitacaoAdocao, { foreignKey: 'idAnimal', as: 'solicitacoes' });
  };

  return Animal;
};
