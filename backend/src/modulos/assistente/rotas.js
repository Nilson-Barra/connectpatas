const { Router } = require('express');
const envolver = require('../../comum/async');
const { equipeDaOng, soResponsavel } = require('../../middlewares/autenticacao');
const { Ong } = require('../../models');
const servico = require('./servico');
const { erro } = require('../../comum/erros');

const rotas = Router();

// O assistente atende visitante sem login (decisão registrada na Seção 10.3),
// e nesse caso não há ONG na sessão. No MVP a plataforma opera com uma ONG,
// então caímos nela. Com várias, o front passará ?ong= vindo da ficha do animal.
async function ongDaVez(req) {
  if (req.session?.usuario?.idOng) return req.session.usuario.idOng;
  if (req.query.ong) return Number(req.query.ong);
  const primeira = await Ong.findOne({ order: [['id', 'ASC']] });
  if (!primeira) throw erro.naoEncontrado('Nenhuma ONG cadastrada.');
  return primeira.id;
}

// ---- UC11: perguntar. Sem login.
rotas.post('/assistente/perguntar', envolver(async (req, res) => {
  const idOng = await ongDaVez(req);
  const { pergunta, idConversa } = req.body || {};
  const resposta = await servico.responder(idOng, pergunta, {
    idUsuario: req.session?.usuario?.id || null,
    idConversa: idConversa || null,
  });
  res.json(resposta);
}));

// ---- UC12: encaminhar a dúvida para a equipe. Sem login.
rotas.post('/assistente/conversas/:id/escalar', envolver(async (req, res) => {
  const idOng = await ongDaVez(req);
  const conversa = await servico.escalar(req.params.id, idOng);
  res.json({ conversa });
}));

// ---- UC12 pelo lado da ONG: a fila do que o agente não soube responder.
rotas.get('/assistente/escaladas', equipeDaOng, envolver(async (req, res) => {
  res.json({ conversas: await servico.listarEscaladas(req.session.usuario.idOng) });
}));

rotas.post('/assistente/conversas/:id/responder', equipeDaOng, envolver(async (req, res) => {
  const mensagens = await servico.responderEscalada(
    req.params.id, req.session.usuario.idOng, (req.body || {}).conteudo
  );
  res.status(201).json({ mensagens });
}));

// ---- UC13: manter a base de conhecimento. Exclusivo do responsável.
rotas.get('/base-conhecimento', soResponsavel, envolver(async (req, res) => {
  const { categoria, ativo } = req.query;
  res.json({
    itens: await servico.listarItens(req.session.usuario.idOng, {
      categoria,
      ativo: ativo === undefined ? undefined : ativo === 'true',
    }),
  });
}));

rotas.post('/base-conhecimento', soResponsavel, envolver(async (req, res) => {
  const item = await servico.criarItem(req.session.usuario.idOng, req.body);
  res.status(201).json({ item });
}));

rotas.put('/base-conhecimento/:id', soResponsavel, envolver(async (req, res) => {
  const item = await servico.atualizarItem(
    req.params.id, req.session.usuario.idOng, req.body
  );
  res.json({ item });
}));

module.exports = rotas;
