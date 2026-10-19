const { QueryTypes } = require('sequelize');
const { ItemConhecimento, ConversaIa, MensagemIa, sequelize } = require('../../models');

const CAMPOS = ['titulo', 'categoria', 'conteudo', 'termos', 'fonte', 'validadoPor',
  'validadoEm', 'ativo'];

const repositorio = {
  // ---- base de conhecimento (UC13)
  listarItens: (idOng, { categoria, ativo } = {}) =>
    ItemConhecimento.findAll({
      where: {
        idOng,
        ...(categoria ? { categoria } : {}),
        ...(ativo === undefined ? {} : { ativo }),
      },
      order: [['categoria', 'ASC'], ['titulo', 'ASC']],
    }),

  itemPorId: (id) => ItemConhecimento.findByPk(id),

  criarItem: (dados) => ItemConhecimento.create(dados),

  async atualizarItem(item, dados) {
    item.set(dados);
    return item.save();
  },

  // Primeira passada da recuperação (Seção 7.4): quem filtra é o índice GIN
  // da coluna tsvector, não o JavaScript. Os termos entram em OR porque a
  // pergunta inteira raramente aparece num item só.
  //
  // Os termos vão como parâmetro e são sanitizados antes de virar to_tsquery:
  // concatenar texto do usuário em SQL é como se abre buraco de injeção.
  async buscar(idOng, termos, limite = 8) {
    const limpos = termos
      .map((t) => t.replace(/[^a-z0-9]/gi, ''))
      .filter((t) => t.length > 2);
    if (!limpos.length) return [];

    const consulta = limpos.join(' | ');
    return sequelize.query(
      `SELECT id, titulo, categoria, conteudo, termos, fonte, validado_por AS "validadoPor",
              validado_em AS "validadoEm",
              ts_rank(busca, to_tsquery('portuguese', :consulta)) AS relevancia
         FROM item_conhecimento
        WHERE id_ong = :idOng
          AND ativo = true
          AND busca @@ to_tsquery('portuguese', :consulta)
        ORDER BY relevancia DESC
        LIMIT :limite`,
      { replacements: { idOng, consulta, limite }, type: QueryTypes.SELECT }
    );
  },

  // ---- conversas (UC11, UC12)
  criarConversa: (dados) => ConversaIa.create(dados),

  conversaPorId: (id) =>
    ConversaIa.findByPk(id, {
      include: [{ model: MensagemIa, as: 'mensagens' }],
      order: [[{ model: MensagemIa, as: 'mensagens' }, 'enviadaEm', 'ASC']],
    }),

  async atualizarConversa(conversa, dados) {
    conversa.set(dados);
    return conversa.save();
  },

  criarMensagem: (dados) => MensagemIa.create(dados),

  mensagensDaConversa: (idConversa) =>
    MensagemIa.findAll({
      where: { idConversa },
      order: [['enviadaEm', 'ASC'], ['id', 'ASC']],
    }),

  // UC12 — a fila do que o agente não soube responder.
  escaladasDaOng: (idOng) =>
    ConversaIa.findAll({
      where: { idOng, escaladaParaOng: true },
      include: [{ model: MensagemIa, as: 'mensagens' }],
      order: [['iniciadaEm', 'DESC']],
    }),

  CAMPOS,
};

module.exports = repositorio;
