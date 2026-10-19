const { Router } = require('express');
const envolver = require('../../comum/async');
const { autenticado } = require('../../middlewares/autenticacao');
const { autenticar, comPerfil, paraSessao } = require('./servico');
const { erro, ErroDeAplicacao } = require('../../comum/erros');
const { bloqueado, registrarFalha, limparFalhas } = require('../../middlewares/protecao');

const rotas = Router();

rotas.post('/login', envolver(async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) throw erro.requisicao('Informe e-mail e senha.');

  // Achado do DAST: 30 tentativas seguidas eram todas processadas. Agora,
  // depois de 10 falhas no mesmo e-mail a partir do mesmo IP, a porta fecha
  // por 15 minutos. A resposta não diz se o e-mail existe.
  const espera = bloqueado(req, email);
  if (espera) {
    res.set('Retry-After', String(espera));
    throw new ErroDeAplicacao(429, 'Muitas tentativas. Tente de novo em alguns minutos.');
  }

  let usuario;
  try {
    usuario = await autenticar(email, senha);
  } catch (e) {
    registrarFalha(req, email);
    throw e;
  }
  limparFalhas(req, email);

  // Trocar o id da sessão no login fecha a porta para fixação de sessão.
  await new Promise((ok, falha) => req.session.regenerate((e) => (e ? falha(e) : ok())));
  req.session.usuario = paraSessao(usuario);

  res.json({ usuario: req.session.usuario });
}));

rotas.post('/logout', envolver(async (req, res) => {
  // Sessão no banco: destruir apaga a linha, então o cookie antigo não serve mais.
  await new Promise((ok) => req.session.destroy(() => ok()));
  res.clearCookie('connectpatas.sid');
  res.status(204).end();
}));

rotas.get('/eu', autenticado, envolver(async (req, res) => {
  const usuario = await comPerfil(req.session.usuario.id);
  if (!usuario) throw erro.naoAutenticado();
  res.json({ usuario: { ...usuario.toJSON(), idOng: req.session.usuario.idOng } });
}));

module.exports = rotas;
