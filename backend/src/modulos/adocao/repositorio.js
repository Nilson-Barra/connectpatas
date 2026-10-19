const {
  SolicitacaoAdocao, Mensagem, Animal, Adotante, Usuario, ResponsavelOng,
} = require('../../models');

// Quem pergunta por uma solicitação quase sempre quer saber de qual animal
// e de qual pessoa ela é. Trazer junto evita o N+1 na listagem do painel.
const COM_ANIMAL_E_PESSOA = [
  { model: Animal, as: 'animal' },
  {
    model: Adotante,
    as: 'adotante',
    include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] }],
  },
];

// Padrão Repository (Seção 7.3): o serviço de adoção não conhece o ORM.
const repositorio = {
  porId: (id, opcoes = {}) =>
    SolicitacaoAdocao.findByPk(id, { include: COM_ANIMAL_E_PESSOA, ...opcoes }),

  // Visão da ONG (UC06): as solicitações dos animais dela, mais recentes antes.
  listarPorOng: (idOng, { status } = {}) =>
    SolicitacaoAdocao.findAll({
      where: status ? { status } : {},
      include: [
        { model: Animal, as: 'animal', where: { idOng }, required: true },
        {
          model: Adotante,
          as: 'adotante',
          include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] }],
        },
      ],
      order: [['dataSolicitacao', 'DESC'], ['id', 'DESC']],
    }),

  // Visão do adotante (UC07, acompanhamento).
  listarPorAdotante: (idAdotante) =>
    SolicitacaoAdocao.findAll({
      where: { idAdotante },
      include: COM_ANIMAL_E_PESSOA,
      order: [['dataSolicitacao', 'DESC'], ['id', 'DESC']],
    }),

  // O banco tem a constraint única, mas conferir antes dá erro legível.
  daPessoaParaOAnimal: (idAnimal, idAdotante) =>
    SolicitacaoAdocao.findOne({ where: { idAnimal, idAdotante } }),

  abertasDoAnimal: (idAnimal, opcoes = {}) =>
    SolicitacaoAdocao.findAll({
      where: { idAnimal, status: ['Pendente', 'Em análise', 'Aprovada'] },
      ...opcoes,
    }),

  criar: (dados, opcoes) => SolicitacaoAdocao.create(dados, opcoes),

  async atualizar(solicitacao, dados, opcoes) {
    solicitacao.set(dados);
    return solicitacao.save(opcoes);
  },

  contarPorStatus: (idOng) =>
    SolicitacaoAdocao.findAll({
      attributes: ['status', [SolicitacaoAdocao.sequelize.fn('count', '*'), 'total']],
      include: [{ model: Animal, as: 'animal', where: { idOng }, attributes: [], required: true }],
      group: ['SolicitacaoAdocao.status'],
      raw: true,
    }),

  // A mensagem precisa de um destinatário concreto. Quando quem escreve é o
  // adotante, o outro lado da conversa é o responsável pela ONG.
  responsavelDaOng: (idOng) => ResponsavelOng.findOne({ where: { idOng } }),

  // ---- mensagens (UC08)
  mensagens: {
    listarPorSolicitacao: (idSolicitacao) =>
      Mensagem.findAll({
        where: { idSolicitacao },
        include: [{ model: Usuario, as: 'remetente', attributes: ['id', 'nome', 'tipoUsuario'] }],
        order: [['dataEnvio', 'ASC'], ['id', 'ASC']],
      }),

    criar: (dados, opcoes) => Mensagem.create(dados, opcoes),
  },
};

module.exports = repositorio;
