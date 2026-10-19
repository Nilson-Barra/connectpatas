import { useEffect, useState } from 'react';
import { api } from '../api';
import { Carregando, Erro, Pill } from '../componentes';
import Icone from '../icones';

const CATEGORIAS = ['Saúde', 'Vacinação', 'Alimentação', 'Comportamento', 'Adoção'];

const VAZIO = {
  titulo: '', categoria: 'Saúde', conteudo: '', termos: '',
  fonte: '', validadoPor: '', ativo: true,
};

const hoje = () => new Date().toLocaleDateString('pt-BR');

// UC13 — a base que o assistente usa para responder. É do responsável pela
// ONG: o que entra aqui vira resposta para o público, então a porta é estreita.
export default function BaseConhecimento() {
  const [itens, setItens] = useState(null);
  const [duvidas, setDuvidas] = useState([]);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null); // null, 'novo' ou o item
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [resposta, setResposta] = useState({});

  const recarregar = () =>
    Promise.all([api.baseConhecimento(), api.duvidasEscaladas()])
      .then(([b, d]) => { setItens(b.itens); setDuvidas(d.conversas); })
      .catch((e) => setErro(e.message));

  useEffect(() => { recarregar(); }, []);

  const mudar = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function abrirNovo() {
    setForm(VAZIO);
    setEditando('novo');
    setErro('');
  }

  function abrirEdicao(item) {
    setForm({
      titulo: item.titulo, categoria: item.categoria, conteudo: item.conteudo,
      termos: item.termos || '', fonte: item.fonte, validadoPor: item.validadoPor,
      ativo: item.ativo,
    });
    setEditando(item);
    setErro('');
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      if (editando === 'novo') await api.criarItem(form);
      else await api.salvarItem(editando.id, form);
      await recarregar();
      setEditando(null);
    } catch (erroApi) {
      setErro(erroApi.message);
    } finally {
      setSalvando(false);
    }
  }

  async function responder(idConversa) {
    const texto = (resposta[idConversa] || '').trim();
    if (!texto) return;
    setErro('');
    try {
      await api.responderDuvida(idConversa, texto);
      setResposta({ ...resposta, [idConversa]: '' });
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <div className="head">
        <div className="stack" style={{ gap: 5, flexGrow: 1 }}>
          <h1>Base de conhecimento</h1>
          <p>
            {itens
              ? `${itens.filter((i) => i.ativo).length} itens ativos · é só daqui que o assistente responde`
              : 'Carregando…'}
          </p>
        </div>
        {!editando && (
          <button className="btn pri" onClick={abrirNovo}>
            <Icone nome="plus" tamanho={17} /> Novo item
          </button>
        )}
      </div>

      <Erro>{erro}</Erro>

      {/* UC12 — o que o agente não soube responder vira trabalho de gente. */}
      {duvidas.length > 0 && (
        <div className="card stack">
          <div className="rowx">
            <h2 style={{ flexGrow: 1 }}>Dúvidas encaminhadas</h2>
            <span className="pill amber">{duvidas.length}</span>
          </div>
          <p className="meta">
            O assistente não achou resposta na base. Vale responder e, se a dúvida
            se repetir, virar item aqui embaixo.
          </p>

          {duvidas.map((c) => (
            <div className="stack" style={{ gap: 10 }} key={c.id}>
              <hr className="hr" />
              {/* Quem lê esta tela é a ONG: só o que ela mesma escreveu aparece
                  como próprio; o agente e o visitante ficam do outro lado. */}
              <div className="msgs" style={{ maxHeight: 'none' }}>
                {(c.mensagens || []).map((m) => (
                  <span className={m.origem === 'ong' ? 'bub me' : 'bub them'} key={m.id}>
                    {m.conteudo}
                    <span className="t">
                      {m.origem === 'usuario' ? 'Visitante'
                        : m.origem === 'ong' ? 'Resposta da ONG' : 'Assistente'}
                    </span>
                  </span>
                ))}
              </div>
              <form
                className="rowx"
                style={{ gap: 9, flexWrap: 'nowrap' }}
                onSubmit={(e) => { e.preventDefault(); responder(c.id); }}
              >
                <label className="f" style={{ flexGrow: 1 }}>
                  <span className="eyebrow oculto">Resposta</span>
                  <input
                    type="text"
                    placeholder="Responder a esta dúvida"
                    value={resposta[c.id] || ''}
                    onChange={(e) => setResposta({ ...resposta, [c.id]: e.target.value })}
                  />
                </label>
                <button className="btn pri" type="submit" aria-label="Enviar resposta"
                        style={{ width: 44, padding: 0 }}>
                  <Icone nome="send" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <form className="card stack" onSubmit={salvar}>
          <h2>{editando === 'novo' ? 'Novo item' : `Editando "${editando.titulo}"`}</h2>

          <div className="fields">
            <div className="f" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="it">Título</label>
              <input id="it" type="text" value={form.titulo} onChange={mudar('titulo')} required />
            </div>
            <div className="f">
              <label htmlFor="ic">Categoria</label>
              <select id="ic" value={form.categoria} onChange={mudar('categoria')}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="f">
            <label htmlFor="ico">Conteúdo</label>
            <textarea id="ico" rows="5" className="fixa" value={form.conteudo}
                      onChange={mudar('conteudo')} required
                      placeholder="Este texto é devolvido ao público quase como está. Escreva direto." />
          </div>

          <div className="f">
            <label htmlFor="ite">Termos de busca</label>
            <input id="ite" type="text" value={form.termos} onChange={mudar('termos')}
                   placeholder="vacina vacinas anual reforço antirrábica carteirinha" />
            <span className="seal">
              As palavras que as pessoas usariam para perguntar, inclusive as erradas.
              É o que faz o assistente encontrar este item.
            </span>
          </div>

          {/* RNF15: sem procedência o item não entra — a API recusa. */}
          <div className="fields">
            <div className="f">
              <label htmlFor="if">Fonte</label>
              <input id="if" type="text" value={form.fonte} onChange={mudar('fonte')} required
                     placeholder="Protocolo interno, clínica parceira…" />
            </div>
            <div className="f">
              <label htmlFor="iv">Validado por</label>
              <input id="iv" type="text" value={form.validadoPor} onChange={mudar('validadoPor')}
                     required placeholder="Nome de quem conferiu" />
            </div>
          </div>

          <label className="rowx" style={{ gap: 8, fontWeight: 400 }}>
            <input type="checkbox" checked={form.ativo} onChange={mudar('ativo')}
                   style={{ width: 'auto', height: 'auto' }} />
            <span>Ativo — o assistente pode usar este item nas respostas</span>
          </label>

          <div className="rowx">
            <span className="spacer" />
            <button type="button" className="btn quiet" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className="btn pri" type="submit" disabled={salvando}>
              <Icone nome="check" tamanho={17} /> {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {!itens && !erro && <Carregando />}
      {itens && itens.length === 0 && (
        <p className="empty">
          A base está vazia. Sem itens, o assistente não responde nada — ele só
          encaminha para vocês.
        </p>
      )}

      {itens && itens.length > 0 && (
        <div className="card stack">
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Item</th><th>Categoria</th><th>Validado por</th><th>Situação</th><th />
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 500 }}>{i.titulo}</td>
                    <td className="meta">{i.categoria}</td>
                    <td className="meta">
                      {i.validadoPor}
                      {i.validadoEm && ` · ${new Date(i.validadoEm).toLocaleDateString('pt-BR')}`}
                    </td>
                    <td>
                      <Pill cor={i.ativo ? 'green' : 'grey'}>{i.ativo ? 'Ativo' : 'Inativo'}</Pill>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn quiet sm" onClick={() => abrirEdicao(i)}>
                        <Icone nome="edit" tamanho={15} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="seal">Última conferência registrada hoje, {hoje()}.</p>
        </div>
      )}
    </>
  );
}
