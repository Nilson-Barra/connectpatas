const { Router } = require('express');
const envolver = require('../../comum/async');
const { soResponsavel, equipeDaOng } = require('../../middlewares/autenticacao');
const { Ong } = require('../../models');
const servicoAnimal = require('../animal/servico');
const servicoAdocao = require('../adocao/servico');
const { erro } = require('../../comum/erros');

const rotas = Router();
const CAMPOS = ['nome', 'cnpj', 'descricao', 'contato', 'endereco', 'cidade'];

rotas.get('/ong', equipeDaOng, envolver(async (req, res) => {
  const ong = await Ong.findByPk(req.session.usuario.idOng);
  if (!ong) throw erro.naoEncontrado('ONG não encontrada.');
  res.json({ ong });
}));

// UC01 — manter os dados institucionais é do responsável.
rotas.put('/ong', soResponsavel, envolver(async (req, res) => {
  const ong = await Ong.findByPk(req.session.usuario.idOng);
  if (!ong) throw erro.naoEncontrado('ONG não encontrada.');
  const dados = Object.fromEntries(
    Object.entries(req.body || {}).filter(([k]) => CAMPOS.includes(k))
  );
  ong.set(dados);
  await ong.save();
  res.json({ ong });
}));

// UC09 — o painel é exclusivo do responsável.
rotas.get('/painel', soResponsavel, envolver(async (req, res) => {
  const { idOng } = req.session.usuario;
  const [animais, solicitacoes] = await Promise.all([
    servicoAnimal.resumoPorStatus(idOng),
    servicoAdocao.resumoPorStatus(idOng),
  ]);
  res.json({ animais, solicitacoes });
}));

module.exports = rotas;
