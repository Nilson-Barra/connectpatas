const repositorio = require('./repositorio');
const { erro } = require('../../comum/erros');

const CAMPOS = ['nome', 'especie', 'raca', 'idade', 'porte', 'condicaoSaude',
  'caracteristicas', 'fotografia', 'status'];

const apenasCampos = (corpo) =>
  Object.fromEntries(Object.entries(corpo || {}).filter(([k]) => CAMPOS.includes(k)));

// Um animal só é visível ou editável por quem pertence à ONG dele.
async function daMinhaOng(id, idOng) {
  const animal = await repositorio.porId(id);
  if (!animal) throw erro.naoEncontrado('Animal não encontrado.');
  if (animal.idOng !== idOng) throw erro.semPermissao('Este animal é de outra ONG.');
  return animal;
}

const servico = {
  consultarDisponiveis: (filtros) => repositorio.disponiveis(filtros),

  async consultarPublico(id) {
    const animal = await repositorio.porId(id);
    if (!animal) throw erro.naoEncontrado('Animal não encontrado.');
    // UC04, regra de negócio: fora de "Disponível" não aparece na área pública.
    if (animal.status !== 'Disponível') {
      throw erro.naoEncontrado('Este animal não está disponível para adoção.');
    }
    return animal;
  },

  listarDaOng: (idOng, filtros) => repositorio.listarPorOng(idOng, filtros),

  cadastrar: (idOng, corpo) => repositorio.criar({ ...apenasCampos(corpo), idOng }),

  async atualizar(id, idOng, corpo) {
    const animal = await daMinhaOng(id, idOng);
    const dados = apenasCampos(corpo);
    // O status muda pelo processo de adoção, não por edição de cadastro:
    // deixar editar à mão abre caminho para o animal ficar "Disponível"
    // com uma solicitação aberta, que é a incoerência do UC05.
    if (dados.status && dados.status !== animal.status && animal.status !== 'Disponível') {
      throw erro.conflito(
        'O status deste animal é controlado pelo processo de adoção. ' +
        'Recuse ou conclua a solicitação para liberá-lo.'
      );
    }
    return repositorio.atualizar(animal, dados);
  },

  async resumoPorStatus(idOng) {
    const linhas = await repositorio.contarPorStatus(idOng);
    const base = { 'Disponível': 0, 'Em processo de adoção': 0, 'Adotado': 0 };
    linhas.forEach((l) => { base[l.status] = Number(l.total); });
    return { ...base, total: Object.values(base).reduce((a, b) => a + b, 0) };
  },

  daMinhaOng,
};

module.exports = servico;
