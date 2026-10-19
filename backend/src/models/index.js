const { sequelize, Sequelize } = require('../config/banco');

const Usuario = require('./usuario')(sequelize);
const Ong = require('./ong')(sequelize);
const { ResponsavelOng, VoluntarioOng, Adotante } = require('./perfis')(sequelize);
const Animal = require('./animal')(sequelize);
const { SolicitacaoAdocao, Mensagem } = require('./adocao')(sequelize);
const { ItemConhecimento, ConversaIa, MensagemIa } = require('./assistente')(sequelize);
const Sessao = require('./sessao')(sequelize);

const db = {
  Usuario, Ong, ResponsavelOng, VoluntarioOng, Adotante,
  Animal, SolicitacaoAdocao, Mensagem,
  ItemConhecimento, ConversaIa, MensagemIa, Sessao,
};

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(db);
});

module.exports = { ...db, sequelize, Sequelize };
