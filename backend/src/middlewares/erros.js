const { ErroDeAplicacao } = require('../comum/erros');

// Converte erro em resposta. Mensagem do Sequelize vira 400 legível,
// e nada de stack trace vazando para o cliente.
module.exports = (err, req, res, _next) => {
  // Achado do DAST: corpo malformado caía como 500, "erro do servidor".
  // É erro de quem enviou, e responder 500 ainda polui o monitoramento.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Requisição grande demais.' });
  }
  if (err instanceof ErroDeAplicacao) {
    return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes });
  }
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const detalhes = err.errors.map((e) => ({ campo: e.path, mensagem: e.message }));
    const unico = err.name === 'SequelizeUniqueConstraintError';
    return res.status(unico ? 409 : 400).json({
      erro: unico ? 'Já existe um registro com esses dados.' : 'Dados inválidos.',
      detalhes,
    });
  }
  console.error('[erro não tratado]', err);
  return res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
};
