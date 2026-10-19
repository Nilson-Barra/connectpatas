const { Router } = require('express');
const envolver = require('../../comum/async');
const { equipeDaOng } = require('../../middlewares/autenticacao');
const servico = require('./servico');

const rotas = Router();

// ---- área pública (UC04, RF10, RF12): sem login
rotas.get('/publico/animais', envolver(async (req, res) => {
  const { especie, porte, texto, pagina, porPagina } = req.query;
  const { rows, count } = await servico.consultarDisponiveis({
    especie, porte, texto,
    pagina: Number(pagina) || 1,
    porPagina: Math.min(Number(porPagina) || 12, 50),
  });
  res.json({ animais: rows, total: count });
}));

rotas.get('/publico/animais/:id', envolver(async (req, res) => {
  res.json({ animal: await servico.consultarPublico(req.params.id) });
}));

// ---- área da ONG (UC02, UC03): responsável e voluntário
rotas.get('/animais', equipeDaOng, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  res.json({ animais: await servico.listarDaOng(idOng, { status: req.query.status }) });
}));

rotas.post('/animais', equipeDaOng, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  res.status(201).json({ animal: await servico.cadastrar(idOng, req.body) });
}));

rotas.get('/animais/:id', equipeDaOng, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  res.json({ animal: await servico.daMinhaOng(req.params.id, idOng) });
}));

rotas.put('/animais/:id', equipeDaOng, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  res.json({ animal: await servico.atualizar(req.params.id, idOng, req.body) });
}));

module.exports = rotas;
