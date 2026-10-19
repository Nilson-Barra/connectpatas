const { Op } = require('sequelize');
const { Animal, Ong } = require('../../models');

// Padrão Repository (Seção 7.3): os módulos de negócio falam com estes
// métodos, nunca com o ORM nem com SQL direto.
const repositorio = {
  porId: (id) => Animal.findByPk(id, { include: [{ model: Ong, as: 'ong' }] }),

  // UC04 — a consulta pública devolve só animais disponíveis.
  async disponiveis({ especie, porte, texto, pagina = 1, porPagina = 12 } = {}) {
    const where = { status: 'Disponível' };
    if (especie) where.especie = especie;
    if (porte) where.porte = porte;
    if (texto) {
      const t = `%${texto}%`;
      where[Op.or] = [
        { nome: { [Op.iLike]: t } },
        { raca: { [Op.iLike]: t } },
        { caracteristicas: { [Op.iLike]: t } },
      ];
    }
    return Animal.findAndCountAll({
      where,
      include: [{ model: Ong, as: 'ong', attributes: ['id', 'nome', 'cidade'] }],
      order: [['createdAt', 'DESC']],
      limit: porPagina,
      offset: (pagina - 1) * porPagina,
    });
  },

  // Visão da ONG: todos os status, só os animais da própria organização.
  listarPorOng: (idOng, { status } = {}) =>
    Animal.findAll({
      where: { idOng, ...(status ? { status } : {}) },
      order: [['nome', 'ASC']],
    }),

  criar: (dados, opcoes) => Animal.create(dados, opcoes),

  async atualizar(animal, dados, opcoes) {
    animal.set(dados);
    return animal.save(opcoes);
  },

  contarPorStatus: (idOng) =>
    Animal.findAll({
      where: { idOng },
      attributes: ['status', [Animal.sequelize.fn('count', '*'), 'total']],
      group: ['status'],
      raw: true,
    }),
};

module.exports = repositorio;
