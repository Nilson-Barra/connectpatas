import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useSessao } from '../sessao';
import { Carregando, Erro, Pill, Retrato } from '../componentes';
import Icone from '../icones';

const MORADIAS = [
  'Casa com quintal cercado', 'Casa sem quintal', 'Apartamento com telas',
  'Apartamento sem telas', 'Sítio ou chácara',
];
const DISPONIBILIDADES = [
  'Manhãs', 'Tardes', 'Noites', 'Fins de semana', 'Tardes e fins de semana',
];

// Ficha pública do animal mais o formulário do UC05.
export default function FichaAnimal() {
  const { id } = useParams();
  const navegar = useNavigate();
  const sessao = useSessao();
  const [animal, setAnimal] = useState(null);
  const [erro, setErro] = useState('');
  const [pedindo, setPedindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({
    telefoneContato: '', moradia: MORADIAS[0], outrosAnimais: '',
    disponibilidade: DISPONIBILIDADES[0], observacoes: '',
  });

  useEffect(() => {
    api.animalPublico(id)
      .then((d) => setAnimal(d.animal))
      .catch((e) => setErro(e.message));
  }, [id]);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const d = await api.solicitar(id, form);
      navegar(`/solicitacoes/${d.solicitacao.id}`);
    } catch (erroApi) {
      setErro(erroApi.message);
      setEnviando(false);
    }
  }

  if (erro && !animal) {
    return (
      <div className="card stack" style={{ maxWidth: 460, margin: '40px auto' }}>
        <h2>Este animal não está disponível</h2>
        <p className="lede">
          Ele pode já estar em processo de adoção ou ter encontrado uma casa.
        </p>
        <Link className="btn pri" to="/">Ver quem ainda espera</Link>
      </div>
    );
  }
  if (!animal) return <Carregando />;

  const fichas = [
    ['Espécie', animal.especie], ['Raça', animal.raca],
    ['Idade', animal.idade], ['Porte', animal.porte],
  ].filter(([, v]) => v);

  return (
    <>
      <Link to="/" className="rowx" style={{ gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--muted)' }}>
        <Icone nome="back" tamanho={16} /> Voltar para a lista
      </Link>

      <div className="grid" style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start',
      }}>
        <Retrato id={animal.id} foto={animal.fotografia} nome={animal.nome} />

        <div className="stack" style={{ gap: 15 }}>
          <div className="rowx" style={{ gap: 11 }}>
            <h1 style={{ marginRight: 2 }}>{animal.nome}</h1>
            <Pill>{animal.status}</Pill>
          </div>

          {animal.caracteristicas && <p className="lede">{animal.caracteristicas}</p>}

          <div className="grid" style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 14,
          }}>
            {fichas.map(([k, v]) => (
              <span className="stack" style={{ gap: 2 }} key={k}>
                <span className="eyebrow">{k}</span>
                <span>{v}</span>
              </span>
            ))}
          </div>

          {animal.condicaoSaude && (
            <div className="stack" style={{ gap: 3 }}>
              <span className="eyebrow">Condição de saúde</span>
              <span>{animal.condicaoSaude}</span>
            </div>
          )}

          {animal.ong && (
            <p className="meta rowx" style={{ gap: 7 }}>
              <Icone nome="pin" tamanho={15} /> {animal.ong.nome} · {animal.ong.cidade}
            </p>
          )}

          <Erro>{erro}</Erro>

          {/* UC05 — só adotante logado abre solicitação. */}
          <div className="rowx">
            {!sessao.usuario && (
              <>
                <Link className="btn pri" to={`/criar-conta?voltar=/animais/${animal.id}`}>
                  <Icone nome="check" tamanho={17} /> Criar conta para adotar
                </Link>
                <Link className="btn quiet" to={`/entrar?voltar=/animais/${animal.id}`}>
                  Já tenho conta
                </Link>
              </>
            )}
            {sessao.daOng && (
              <button className="btn pri" disabled>A solicitação é feita pelo adotante</button>
            )}
            {sessao.adotante && !pedindo && (
              <button className="btn pri" onClick={() => setPedindo(true)}>
                <Icone nome="check" tamanho={17} /> Solicitar adoção
              </button>
            )}
          </div>
        </div>
      </div>

      {sessao.adotante && pedindo && (
        <form className="card stack" onSubmit={enviar}>
          <div className="stack" style={{ gap: 4 }}>
            <h2>Solicitar a adoção de {animal.nome}</h2>
            <p className="meta">
              A ONG usa estas informações para avaliar se o ambiente combina com o
              animal. Nenhuma delas aparece na página pública.
            </p>
          </div>

          <div className="fields">
            <div className="f">
              <label htmlFor="stel">Telefone para contato</label>
              <input id="stel" type="text" placeholder="(19) 90000-0000"
                     value={form.telefoneContato} onChange={mudar('telefoneContato')} required />
            </div>
            <div className="f">
              <label htmlFor="smor">Tipo de moradia</label>
              <select id="smor" value={form.moradia} onChange={mudar('moradia')}>
                {MORADIAS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="fields">
            <div className="f">
              <label htmlFor="sout">Outros animais em casa</label>
              <input id="sout" type="text" placeholder="Nenhum, ou descreva quais"
                     value={form.outrosAnimais} onChange={mudar('outrosAnimais')} required />
            </div>
            <div className="f">
              <label htmlFor="sdis">Disponibilidade para a visita</label>
              <select id="sdis" value={form.disponibilidade} onChange={mudar('disponibilidade')}>
                {DISPONIBILIDADES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="f">
            <label htmlFor="smsg">Mensagem para a ONG (opcional)</label>
            <textarea id="smsg" rows="2" placeholder="Conte por que você escolheu este animal"
                      value={form.observacoes} onChange={mudar('observacoes')} />
          </div>

          <div className="rowx">
            <span className="spacer" />
            <button type="button" className="btn quiet" onClick={() => setPedindo(false)}>
              Cancelar
            </button>
            <button className="btn pri" type="submit" disabled={enviando}>
              <Icone nome="check" tamanho={17} /> {enviando ? 'Enviando…' : 'Enviar solicitação'}
            </button>
          </div>
        </form>
      )}

      <div className="notice">
        <Icone nome="spark" tamanho={19} />
        <span>
          Antes de solicitar, vale saber o que a rotina exige: alimentação,
          vacinação anual e tempo de convivência. Pergunte à equipe da ONG o que
          ainda estiver em dúvida.
        </span>
      </div>
    </>
  );
}
