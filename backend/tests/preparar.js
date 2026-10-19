// Recria o banco de teste do zero antes da suíte: migrations + seeders.
// É por isso que DATABASE_URL_TEST precisa apontar para OUTRO banco.
//
// Chamamos o sequelize-cli pelo arquivo dele, com o mesmo node que está
// rodando os testes, em vez de 'npx'. No Windows o npx é um .cmd e o
// spawnSync não o encontra sem shell — era o erro 'spawnSync npx ENOENT'.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const CLI = path.join(RAIZ, 'node_modules', 'sequelize-cli', 'lib', 'sequelize');

module.exports = async () => {
  const env = { ...process.env, NODE_ENV: 'test' };
  const rodar = (args) =>
    execFileSync(process.execPath, [CLI, ...args], { env, stdio: 'pipe', cwd: RAIZ });

  rodar(['db:migrate:undo:all']);
  rodar(['db:migrate']);
  rodar(['db:seed:all']);
};
