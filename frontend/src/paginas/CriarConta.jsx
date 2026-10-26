import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSessao } from '../sessao';
import { Erro, destinoSeguro } from '../componentes';
import Icone from '../icones';

// Criar conta de adotante pela tela. Conta da equipe da ONG não se cria aqui:
// quem cadastra voluntário é a própria ONG.
export default function CriarConta() {
  const sessao = useSessao();
  const navegar = useNavigate();
  const [busca] = useSearchParams();
  const voltar = destinoSeguro(busca.get('voltar'));

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', senha: '', confirmar: '',
  });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // As mesmas regras do servidor, conferidas antes para dar o aviso na hora.
  const senhaOk = form.senha.length >= 8 && /[a-zA-Z]/.test(form.senha) && /\d/.test(form.senha);
  const confereOk = form.confirmar === form.senha;

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!senhaOk) { setErro('A senha precisa ter pelo menos 8 caracteres, com letras e números.'); return; }
    if (!confereOk) { setErro('As duas senhas não são iguais.'); return; }
    setEnviando(true);
    try {
      const { confirmar, ...dados } = form;
      await sessao.cadastrar(dados);
      navegar(voltar || '/');
    } catch (erroApi) {
      setErro(erroApi.message);
      setEnviando(false);
    }
  }

  return (
    <div className="grid" style={{
      gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
      gap: 28, alignItems: 'center', paddingBlock: 18,
    }}>
      <div className="stack" style={{ gap: 18 }}>
        <span className="eyebrow">Para quem quer adotar</span>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.12 }}>
          Crie sua conta e peça a adoção em poucos minutos.
        </h1>
        <p className="lede">
          Com a conta você solicita a adoção, acompanha cada etapa do pedido e
          conversa com a ONG pelo próprio site.
        </p>
      </div>

      <form className="card stack" style={{ gap: 16 }} onSubmit={enviar} noValidate>
        <div className="stack" style={{ gap: 5 }}>
          <h2>Criar conta</h2>
          <p className="meta">
            Já tem conta? <Link to={voltar ? `/entrar?voltar=${encodeURIComponent(voltar)}` : '/entrar'}>Entrar</Link>
          </p>
        </div>

        <div className="f">
          <label htmlFor="cn">Nome</label>
          <input id="cn" type="text" autoComplete="name" required maxLength={120}
                 value={form.nome} onChange={mudar('nome')} />
        </div>
        <div className="f">
          <label htmlFor="ce">E-mail</label>
          <input id="ce" type="email" autoComplete="email" required maxLength={120}
                 value={form.email} onChange={mudar('email')} />
        </div>
        <div className="f">
          <label htmlFor="ct">Telefone (opcional)</label>
          <input id="ct" type="tel" autoComplete="tel" maxLength={20} placeholder="(19) 99999-9999"
                 value={form.telefone} onChange={mudar('telefone')} />
        </div>
        <div className="f">
          <label htmlFor="cs">Senha</label>
          <input id="cs" type="password" autoComplete="new-password" required maxLength={72}
                 value={form.senha} onChange={mudar('senha')} aria-describedby="regra-senha" />
          <span id="regra-senha" className="meta" style={{ color: form.senha && !senhaOk ? 'var(--acc)' : undefined }}>
            Pelo menos 8 caracteres, com letras e números.
          </span>
        </div>
        <div className="f">
          <label htmlFor="cc">Repita a senha</label>
          <input id="cc" type="password" autoComplete="new-password" required maxLength={72}
                 value={form.confirmar} onChange={mudar('confirmar')} />
          {form.confirmar && !confereOk && (
            <span className="meta" style={{ color: 'var(--acc)' }}>As senhas não são iguais.</span>
          )}
        </div>

        <Erro>{erro}</Erro>

        <button className="btn pri wide" type="submit" disabled={enviando}>
          <Icone nome="user" tamanho={17} /> {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>

        <p className="seal">
          Seus dados ficam só com a ONG para avaliar o pedido de adoção. A senha é
          guardada como hash, e ninguém da ONG consegue vê-la.
        </p>
      </form>
    </div>
  );
}
