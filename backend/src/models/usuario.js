const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');

const PERFIS = ['responsavel_ong', 'voluntario_ong', 'adotante'];

module.exports = (sequelize) => {
  class Usuario extends Model {
    // A senha nunca é comparada em texto puro nem sai do model.
    conferirSenha(senha) {
      return bcrypt.compare(senha, this.senhaHash);
    }
    // Nunca devolve senhaHash numa resposta da API.
    toJSON() {
      const { senhaHash, ...resto } = { ...this.get() };
      return resto;
    }
  }

  Usuario.init(
    {
      nome: { type: DataTypes.STRING(120), allowNull: false,
        validate: { notEmpty: { msg: 'Informe o nome.' } } },
      email: { type: DataTypes.STRING(120), allowNull: false, unique: true,
        validate: { isEmail: { msg: 'E-mail inválido.' } },
        set(v) { this.setDataValue('email', String(v || '').trim().toLowerCase()); } },
      senhaHash: { type: DataTypes.STRING(255), allowNull: false },
      tipoUsuario: { type: DataTypes.ENUM(...PERFIS), allowNull: false },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { sequelize, modelName: 'Usuario', tableName: 'usuario' }
  );

  Usuario.PERFIS = PERFIS;
  Usuario.gerarHash = (senha) => bcrypt.hash(senha, 10);

  Usuario.associate = (m) => {
    Usuario.hasOne(m.ResponsavelOng, { foreignKey: 'idUsuario', as: 'responsavel' });
    Usuario.hasOne(m.VoluntarioOng, { foreignKey: 'idUsuario', as: 'voluntario' });
    Usuario.hasOne(m.Adotante, { foreignKey: 'idUsuario', as: 'adotante' });
  };

  return Usuario;
};
