const { erro } = require('../comum/erros');

// RNF03 — controle de acesso por perfil.
// A sessão guarda só o id e o perfil; o resto vem do banco quando precisa.
const autenticado = (req, _res, next) => {
  if (!req.session || !req.session.usuario) return next(erro.naoAutenticado());
  next();
};

const comPerfil = (...perfis) => (req, _res, next) => {
  if (!req.session || !req.session.usuario) return next(erro.naoAutenticado());
  if (!perfis.includes(req.session.usuario.tipoUsuario)) return next(erro.semPermissao());
  next();
};

// Atalhos nomeados pelos casos de uso, para a rota ficar legível:
// painel (UC09), base de conhecimento (UC13) e cadastro de ONG (UC01)
// são exclusivos do responsável; animais e solicitações os dois fazem.
const soResponsavel = comPerfil('responsavel_ong');
const equipeDaOng = comPerfil('responsavel_ong', 'voluntario_ong');
const soAdotante = comPerfil('adotante');

module.exports = { autenticado, comPerfil, soResponsavel, equipeDaOng, soAdotante };
