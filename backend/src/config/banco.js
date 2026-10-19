const { Sequelize } = require('sequelize');
const config = require('./config');

const ambiente = process.env.NODE_ENV || 'development';
const cfg = config[ambiente];

if (!cfg.url) {
  throw new Error(
    'DATABASE_URL não definida. Copie .env.example para .env e preencha a string de conexão.'
  );
}

const sequelize = new Sequelize(cfg.url, cfg);

module.exports = { sequelize, Sequelize, ambiente };
