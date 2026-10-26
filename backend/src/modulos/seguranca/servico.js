const { Usuario, ResponsavelOng, VoluntarioOng, Adotante, sequelize } = require('../../models');
const { erro } = require('../../comum/erros');

// Carrega o usuário com o vínculo do perfil, que é de onde sai o idOng.
const comPerfil = (id) =>
  Usuario.findByPk(id, {
    include: [
      { model: ResponsavelOng, as: 'responsavel' },
      { model: VoluntarioOng, as: 'voluntario' },
      { model: Adotante, as: 'adotante' },
    ],
  });

const ongDo = (usuario) =>
  usuario.responsavel?.idOng ?? usuario.voluntario?.idOng ?? null;

async function autenticar(email, senha) {
  // Mensagem única para e-mail inexistente e senha errada: dizer qual dos
  // dois falhou entrega para quem tenta descobrir quais e-mails existem.
  const generico = erro.requisicao('E-mail ou senha incorretos.');

  const achado = await Usuario.findOne({
    where: { email: String(email || '').trim().toLowerCase() },
  });
  if (!achado || !achado.ativo) throw generico;
  if (!(await achado.conferirSenha(senha))) throw generico;

  return comPerfil(achado.id);
}

// ---- criar conta de adotante pela tela
//
// Só adotante se cadastra sozinho. Conta da equipe de uma ONG continua sendo
// criada pela própria ONG: deixar alguém se declarar voluntário daria acesso
// aos dados de todos os adotantes dela. Por isso o perfil não vem do
// formulário — é fixo aqui, e qualquer "tipoUsuario" enviado é ignorado.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCadastro(corpo) {
  const nome = String(corpo.nome || '').trim().replace(/\s+/g, ' ');
  const email = String(corpo.email || '').trim().toLowerCase();
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  const telefone = String(corpo.telefone || '').trim();
  const infoAdocao = String(corpo.infoAdocao || '').trim();

  const problemas = [];
  if (nome.length < 2 || nome.length > 120) problemas.push({ campo: 'nome', mensagem: 'Informe seu nome.' });
  if (!EMAIL.test(email) || email.length > 120) problemas.push({ campo: 'email', mensagem: 'E-mail inválido.' });
  // 72 é o limite do bcrypt: acima disso o resto da senha seria ignorado
  // sem ninguém perceber.
  if (senha.length < 8 || senha.length > 72) {
    problemas.push({ campo: 'senha', mensagem: 'A senha precisa ter de 8 a 72 caracteres.' });
  } else if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
    problemas.push({ campo: 'senha', mensagem: 'Use letras e números na senha.' });
  }
  if (telefone && !/^[\d\s()+-]{8,20}$/.test(telefone)) {
    problemas.push({ campo: 'telefone', mensagem: 'Telefone inválido.' });
  }
  if (infoAdocao.length > 500) {
    problemas.push({ campo: 'infoAdocao', mensagem: 'Resuma em até 500 caracteres.' });
  }
  if (problemas.length) throw erro.requisicao(problemas[0].mensagem, problemas);
  return { nome, email, senha, telefone: telefone || null, infoAdocao: infoAdocao || null };
}

async function cadastrarAdotante(corpo) {
  const dados = validarCadastro(corpo || {});
  const existente = await Usuario.findOne({ where: { email: dados.email } });
  if (existente) {
    throw erro.conflito('Já existe uma conta com este e-mail. Entre com ela ou use outro e-mail.');
  }
  const senhaHash = await Usuario.gerarHash(dados.senha);
  // Usuário e perfil de adotante nascem juntos ou não nascem.
  const criado = await sequelize.transaction(async (transaction) => {
    const usuario = await Usuario.create({
      nome: dados.nome, email: dados.email, senhaHash, tipoUsuario: 'adotante', ativo: true,
    }, { transaction });
    await Adotante.create({
      idUsuario: usuario.id, telefone: dados.telefone, infoAdocao: dados.infoAdocao,
    }, { transaction });
    return usuario;
  });
  return comPerfil(criado.id);
}

const paraSessao = (usuario) => ({
  id: usuario.id,
  nome: usuario.nome,
  tipoUsuario: usuario.tipoUsuario,
  idOng: ongDo(usuario),
});

module.exports = { autenticar, comPerfil, ongDo, paraSessao, cadastrarAdotante };
