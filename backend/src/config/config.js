// Lido pelo sequelize-cli (migrations e seeders) e pelo src/config/banco.js.
// Caminho explícito: assim funciona rodando de qualquer diretório,
// não só da raiz do backend.
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

const comum = {
  dialect: 'postgres',
  define: { underscored: true, freezeTableName: true, timestamps: true },
  logging: false,
};

// O Neon (e a maioria dos Postgres gerenciados) exige SSL.
const ssl = { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } };
const usaSsl = (url) => /neon\.tech|supabase|render\.com|sslmode=require/.test(url || '');

const daUrl = (url) => ({ ...comum, url, ...(usaSsl(url) ? ssl : {}) });

module.exports = {
  development: daUrl(process.env.DATABASE_URL),
  test: daUrl(process.env.DATABASE_URL_TEST || process.env.DATABASE_URL),
  production: daUrl(process.env.DATABASE_URL),
};
