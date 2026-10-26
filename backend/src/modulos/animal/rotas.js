const express = require('express');

const { Router } = express;
const envolver = require('../../comum/async');
const { equipeDaOng } = require('../../middlewares/autenticacao');
const servico = require('./servico');
const { TIPOS } = require('./foto');

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

// ---- foto do animal (RF03)
// A foto vai como o próprio arquivo no corpo, com o Content-Type da imagem.
// Sem formulário multipart: menos uma biblioteca e menos um formato a validar.
const recebeImagem = express.raw({ type: TIPOS, limit: '5mb' });

rotas.put('/animais/:id/foto', equipeDaOng, recebeImagem, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  res.json({ animal: await servico.salvarFoto(req.params.id, idOng, req.body) });
}));

rotas.delete('/animais/:id/foto', equipeDaOng, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  res.json({ animal: await servico.removerFoto(req.params.id, idOng) });
}));

rotas.get('/animais/:id/foto', envolver(async (req, res) => {
  const usuario = req.session && req.session.usuario;
  const { dados, tipo, publica } = await servico.lerFoto(req.params.id, usuario);
  res.set({
    'Content-Type': tipo,
    'Content-Disposition': 'inline',
    // Foto pública pode ficar em cache (o endereço muda a cada troca);
    // foto de animal fora do catálogo, não.
    'Cache-Control': publica ? 'public, max-age=604800, immutable' : 'private, no-store',
  });
  res.send(dados);
}));

module.exports = rotas;
