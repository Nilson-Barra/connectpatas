// Erro que a API sabe traduzir em resposta. Qualquer outro vira 500.
class ErroDeAplicacao extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

const erro = {
  requisicao: (msg, det) => new ErroDeAplicacao(400, msg, det),
  naoAutenticado: (msg = 'Faça login para continuar.') => new ErroDeAplicacao(401, msg),
  semPermissao: (msg = 'Seu perfil não permite esta operação.') => new ErroDeAplicacao(403, msg),
  naoEncontrado: (msg = 'Registro não encontrado.') => new ErroDeAplicacao(404, msg),
  conflito: (msg) => new ErroDeAplicacao(409, msg),
};

module.exports = { ErroDeAplicacao, erro };
