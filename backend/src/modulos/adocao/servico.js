const repositorio = require('./repositorio');
const repositorioAnimal = require('../animal/repositorio');
const { sequelize } = require('../../models');
const { erro } = require('../../comum/erros');

const CAMPOS = ['telefoneContato', 'moradia', 'outrosAnimais', 'disponibilidade', 'observacoes'];

// Diagrama de máquina de estados (Figura 8). Cada status diz para onde pode ir;
// quem não está aqui é estado final. Tentar sair dele é 409, não 400: o pedido
// está correto, o processo é que já acabou.
const TRANSICOES = {
  'Pendente': ['Em análise', 'Recusada'],
  'Em análise': ['Aprovada', 'Recusada'],
  'Aprovada': ['Concluída', 'Recusada'],
};

// A etapa é o que a tela do adotante mostra como progresso (UC07).
const ETAPA = { 'Pendente': 1, 'Em análise': 2, 'Aprovada': 3, 'Concluída': 4, 'Recusada': 4 };

const apenasCampos = (corpo) =>
  Object.fromEntries(Object.entries(corpo || {}).filter(([k]) => CAMPOS.includes(k)));

// Só enxergam uma solicitação o adotante que a abriu e a equipe da ONG do animal.
function conferirAcesso(solicitacao, usuario) {
  const { tipoUsuario, id, idOng } = usuario;
  if (tipoUsuario === 'adotante' && solicitacao.idAdotante === id) return;
  if (tipoUsuario !== 'adotante' && solicitacao.animal && solicitacao.animal.idOng === idOng) return;
  throw erro.semPermissao('Esta solicitação não é sua.');
}

const servico = {
  // ---- UC05: o adotante solicita a adoção
  async solicitar(idAdotante, idAnimal, corpo) {
    const animal = await repositorioAnimal.porId(idAnimal);
    if (!animal) throw erro.naoEncontrado('Animal não encontrado.');

    // Mesma regra do catálogo público: o que não está disponível não se pede.
    if (animal.status !== 'Disponível') {
      throw erro.conflito('Este animal já está em processo de adoção ou foi adotado.');
    }

    const repetida = await repositorio.daPessoaParaOAnimal(idAnimal, idAdotante);
    if (repetida) {
      throw erro.conflito('Você já abriu uma solicitação para este animal.');
    }

    // A solicitação e a mudança de status do animal são um fato só: se uma
    // falhar, a outra não pode valer. Daí a transação.
    return sequelize.transaction(async (transaction) => {
      const solicitacao = await repositorio.criar({
        idAnimal,
        idAdotante,
        dataSolicitacao: new Date(),
        status: 'Pendente',
        etapa: 1,
        ...apenasCampos(corpo),
      }, { transaction });

      await repositorioAnimal.atualizar(
        animal, { status: 'Em processo de adoção' }, { transaction }
      );

      return repositorio.porId(solicitacao.id, { transaction });
    });
  },

  // ---- UC06: a equipe da ONG acompanha e decide
  listarDaOng: (idOng, filtros) => repositorio.listarPorOng(idOng, filtros),

  listarMinhas: (idAdotante) => repositorio.listarPorAdotante(idAdotante),

  async detalhe(id, usuario) {
    const solicitacao = await repositorio.porId(id);
    if (!solicitacao) throw erro.naoEncontrado('Solicitação não encontrada.');
    conferirAcesso(solicitacao, usuario);
    return solicitacao;
  },

  // ---- UC06 e UC07: mudar o status é o que move o processo
  async mudarStatus(id, usuario, novoStatus, observacoes) {
    const solicitacao = await repositorio.porId(id);
    if (!solicitacao) throw erro.naoEncontrado('Solicitação não encontrada.');
    conferirAcesso(solicitacao, usuario);

    const permitidos = TRANSICOES[solicitacao.status];
    if (!permitidos) {
      throw erro.conflito(`Esta solicitação já está ${solicitacao.status.toLowerCase()}.`);
    }
    if (!permitidos.includes(novoStatus)) {
      throw erro.requisicao(
        `De "${solicitacao.status}" só é possível ir para ${permitidos.join(' ou ')}.`
      );
    }

    return sequelize.transaction(async (transaction) => {
      await repositorio.atualizar(solicitacao, {
        status: novoStatus,
        etapa: ETAPA[novoStatus],
        ...(observacoes ? { observacoes } : {}),
      }, { transaction });

      const animal = solicitacao.animal;

      if (novoStatus === 'Concluída') {
        // UC07 — a adoção aconteceu. O animal sai de circulação e qualquer
        // outra solicitação aberta para ele perde o objeto.
        await repositorioAnimal.atualizar(animal, { status: 'Adotado' }, { transaction });
        const outras = await repositorio.abertasDoAnimal(animal.id, { transaction });
        for (const outra of outras) {
          if (outra.id === solicitacao.id) continue;
          await repositorio.atualizar(outra, { status: 'Recusada', etapa: 4 }, { transaction });
        }
      }

      if (novoStatus === 'Recusada') {
        // O animal só volta para a vitrine se não sobrou ninguém na fila.
        const abertas = await repositorio.abertasDoAnimal(animal.id, { transaction });
        const restantes = abertas.filter((s) => s.id !== solicitacao.id);
        if (!restantes.length && animal.status !== 'Adotado') {
          await repositorioAnimal.atualizar(animal, { status: 'Disponível' }, { transaction });
        }
      }

      return repositorio.porId(solicitacao.id, { transaction });
    });
  },

  // ---- UC08: conversa entre o adotante e a ONG, presa à solicitação
  async listarMensagens(id, usuario) {
    const solicitacao = await servico.detalhe(id, usuario);
    return repositorio.mensagens.listarPorSolicitacao(solicitacao.id);
  },

  async enviarMensagem(id, usuario, conteudo) {
    const texto = (conteudo || '').trim();
    if (!texto) throw erro.requisicao('A mensagem não pode ser vazia.');

    const solicitacao = await servico.detalhe(id, usuario);
    if (solicitacao.encerrada) {
      throw erro.conflito('Esta solicitação já foi encerrada.');
    }

    let idDestinatario;
    if (usuario.tipoUsuario === 'adotante') {
      const responsavel = await repositorio.responsavelDaOng(solicitacao.animal.idOng);
      if (!responsavel) throw erro.conflito('Esta ONG não tem responsável cadastrado.');
      idDestinatario = responsavel.idUsuario;
    } else {
      idDestinatario = solicitacao.idAdotante;
    }

    await repositorio.mensagens.criar({
      idSolicitacao: solicitacao.id,
      idRemetente: usuario.id,
      idDestinatario,
      conteudo: texto,
      dataEnvio: new Date(),
    });

    return repositorio.mensagens.listarPorSolicitacao(solicitacao.id);
  },

  // Alimenta o painel do UC09 junto com o resumo de animais.
  async resumoPorStatus(idOng) {
    const linhas = await repositorio.contarPorStatus(idOng);
    const base = { 'Pendente': 0, 'Em análise': 0, 'Aprovada': 0, 'Concluída': 0, 'Recusada': 0 };
    linhas.forEach((l) => { base[l.status] = Number(l.total); });
    const abertas = base['Pendente'] + base['Em análise'] + base['Aprovada'];
    return { ...base, abertas, total: Object.values(base).reduce((a, b) => a + b, 0) };
  },
};

module.exports = servico;
