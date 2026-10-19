const { DataTypes } = require('sequelize');

// Model da tabela de sessões, criada pela migration.
// O connect-session-sequelize precisa recebê-la pronta; sem isso ele
// tenta usar um model que não existe e o login quebra com 500.
module.exports = (sequelize) =>
  sequelize.define('Sessao', {
    sid: { type: DataTypes.STRING(36), primaryKey: true },
    expires: { type: DataTypes.DATE },
    data: { type: DataTypes.TEXT },
  }, { tableName: 'sessao', underscored: true, timestamps: true });
