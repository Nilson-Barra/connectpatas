import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessao } from '../sessao';
import { Erro } from '../componentes';

export default function Entrar() {
  const sessao = useSessao();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEntrando(true);
    try {
      const usuario = await sessao.entrar(email, senha);
      // Cada perfil cai onde tem trabalho para fazer.
      navegar(usuario.tipoUsuario === 'adotante' ? '/minhas-solicitacoes'
        : usuario.tipoUsuario === 'responsavel_ong' ? '/painel' : '/solicitacoes');
    } catch (erroApi) {
      setErro(erroApi.message);
      setEntrando(false);
    }
  }

  return (
    <div className="grid" style={{
      gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
      gap: 28, alignItems: 'center', paddingBlock: 18,
    }}>
      <div className="stack" style={{ gap: 18 }}>
        <span className="eyebrow">Projeto Integrador · IFSP Hortolândia</span>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.12 }}>
          Cuidar bem começa por encontrar o lar certo.
        </h1>
        <p className="lede">
          Plataforma que ajuda ONGs de proteção animal a organizar acolhimentos,
          adoções e o acompanhamento de cada história.
        </p>
      </div>

      <form className="card stack" style={{ gap: 16 }} onSubmit={enviar}>
        <div className="stack" style={{ gap: 5 }}>
          <h2>Entrar na plataforma</h2>
          <p className="meta">
            As contas são criadas pela ONG. Para conhecer o sistema, use um dos
            acessos de demonstração listados no README do projeto.
          </p>
        </div>

        <div className="f">
          <label htmlFor="em">E-mail</label>
          <input id="em" type="email" autoComplete="email" required
                 value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor="pw">Senha</label>
          <input id="pw" type="password" autoComplete="current-password" required
                 value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>

        <Erro>{erro}</Erro>

        <button className="btn pri wide" type="submit" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="seal">
          A senha trafega só no envio do formulário e é guardada no servidor como
          hash. A sessão fica num cookie que o JavaScript da página não lê.
        </p>
      </form>
    </div>
  );
}
