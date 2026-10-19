const { Usuario, ResponsavelOng, VoluntarioOng, Adotante } = require('../../models');
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

const paraSessao = (usuario) => ({
  id: usuario.id,
  nome: usuario.nome,
  tipoUsuario: usuario.tipoUsuario,
  idOng: ongDo(usuario),
});

module.exports = { autenticar, comPerfil, ongDo, paraSessao };
