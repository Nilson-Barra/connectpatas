const { criarApp } = require('./app');
const { sequelize } = require('./models');

const porta = Number(process.env.PORT) || 3001;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Banco conectado.');
    criarApp().listen(porta, () => console.log(`API do ConnectPatas em http://localhost:${porta}`));
  } catch (e) {
    console.error('Não foi possível conectar ao banco:', e.message);
    process.exit(1);
  }
})();
