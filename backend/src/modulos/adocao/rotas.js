const { Router } = require('express');
const envolver = require('../../comum/async');
const { autenticado, equipeDaOng, soAdotante } = require('../../middlewares/autenticacao');
const servico = require('./servico');

const rotas = Router();

// ---- UC05: solicitar adoção. Só adotante abre solicitação.
rotas.post('/animais/:id/solicitacoes', soAdotante, envolver(async (req, res) => {
  const solicitacao = await servico.solicitar(req.session.usuario.id, req.params.id, req.body);
  res.status(201).json({ solicitacao });
}));

// ---- UC06: a fila de solicitações da ONG
rotas.get('/solicitacoes', equipeDaOng, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  res.json({ solicitacoes: await servico.listarDaOng(idOng, { status: req.query.status }) });
}));

// ---- UC07: o adotante acompanha o que pediu
rotas.get('/minhas-solicitacoes', soAdotante, envolver(async (req, res) => {
  res.json({ solicitacoes: await servico.listarMinhas(req.session.usuario.id) });
}));

// Os dois lados abrem o detalhe; o serviço confere de quem é.
rotas.get('/solicitacoes/:id', autenticado, envolver(async (req, res) => {
  res.json({ solicitacao: await servico.detalhe(req.params.id, req.session.usuario) });
}));

// ---- UC06 e UC07: mover o processo é da equipe da ONG.
rotas.put('/solicitacoes/:id/status', equipeDaOng, envolver(async (req, res) => {
  const { status, observacoes } = req.body || {};
  const solicitacao = await servico.mudarStatus(
    req.params.id, req.session.usuario, status, observacoes
  );
  res.json({ solicitacao });
}));

// ---- UC08: conversa presa à solicitação
rotas.get('/solicitacoes/:id/mensagens', autenticado, envolver(async (req, res) => {
  res.json({ mensagens: await servico.listarMensagens(req.params.id, req.session.usuario) });
}));

rotas.post('/solicitacoes/:id/mensagens', autenticado, envolver(async (req, res) => {
  const mensagens = await servico.enviarMensagem(
    req.params.id, req.session.usuario, (req.body || {}).conteudo
  );
  res.status(201).json({ mensagens });
}));

module.exports = rotas;
