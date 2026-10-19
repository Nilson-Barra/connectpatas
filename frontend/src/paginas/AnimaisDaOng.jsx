import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Carregando, Erro, Pill } from '../componentes';
import Icone from '../icones';

const VAZIO = {
  nome: '', especie: 'Canina', raca: '', idade: '', porte: 'Médio',
  condicaoSaude: '', caracteristicas: '',
};

// UC02 e UC03 — cadastro e manutenção dos animais. Responsável e voluntário.
export default function AnimaisDaOng() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null); // null, 'novo' ou o animal
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [busca, definirBusca] = useSearchParams();

  const recarregar = () =>
    api.animaisDaOng()
      .then((d) => setLista(d.animais))
      .catch((e) => setErro(e.message));

  useEffect(() => { recarregar(); }, []);

  // Quem chega pelo botão do painel (?novo=1) cai com o formulário aberto.
  // Limpamos o parâmetro em seguida para o F5 não reabrir sem querer.
  useEffect(() => {
    if (busca.get('novo') === '1') {
      abrirNovo();
      definirBusca({}, { replace: true });
    }
  }, [busca]);

  function abrirNovo() {
    setForm(VAZIO);
    setEditando('novo');
    setErro('');
  }

  function abrirEdicao(a) {
    setForm({
      nome: a.nome || '', especie: a.especie || 'Canina', raca: a.raca || '',
      idade: a.idade || '', porte: a.porte || 'Médio',
      condicaoSaude: a.condicaoSaude || '', caracteristicas: a.caracteristicas || '',
    });
    setEditando(a);
    setErro('');
  }

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      if (editando === 'novo') await api.criarAnimal(form);
      else await api.salvarAnimal(editando.id, form);
      await recarregar();
      setEditando(null);
    } catch (erroApi) {
      setErro(erroApi.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="head">
        <div className="stack" style={{ gap: 5, flexGrow: 1 }}>
          <h1>Animais acolhidos</h1>
          <p>
            {lista ? `${lista.length} cadastrados · ` : ''}
            o status controla o que aparece na página pública
          </p>
        </div>
        {!editando && (
          <button className="btn pri" onClick={abrirNovo}>
            <Icone nome="plus" tamanho={17} /> Cadastrar animal
          </button>
        )}
      </div>

      <Erro>{erro}</Erro>

      {editando && (
        <form className="card stack" onSubmit={salvar}>
          <h2>{editando === 'novo' ? 'Cadastrar animal' : `Editar ${editando.nome}`}</h2>

          <div className="fields">
            <div className="f">
              <label htmlFor="an">Nome</label>
              <input id="an" type="text" value={form.nome} onChange={mudar('nome')} required />
            </div>
            <div className="f">
              <label htmlFor="ae">Espécie</label>
              <select id="ae" value={form.especie} onChange={mudar('especie')}>
                <option>Canina</option><option>Felina</option><option>Outra</option>
              </select>
            </div>
            <div className="f">
              <label htmlFor="ar">Raça</label>
              <input id="ar" type="text" value={form.raca} onChange={mudar('raca')} placeholder="SRD" />
            </div>
          </div>

          <div className="fields">
            <div className="f">
              <label htmlFor="ai">Idade aproximada</label>
              <input id="ai" type="text" value={form.idade} onChange={mudar('idade')}
                     placeholder="3 anos" />
            </div>
            <div className="f">
              <label htmlFor="ap">Porte</label>
              <select id="ap" value={form.porte} onChange={mudar('porte')}>
                <option>Pequeno</option><option>Médio</option><option>Grande</option>
              </select>
            </div>
            <div className="f">
              <label htmlFor="asa">Condição de saúde</label>
              <input id="asa" type="text" value={form.condicaoSaude}
                     onChange={mudar('condicaoSaude')} placeholder="Castrado, vacinas em dia" />
            </div>
          </div>

          <div className="f">
            <label htmlFor="ah">História e características</label>
            <textarea id="ah" rows="3" value={form.caracteristicas}
                      onChange={mudar('caracteristicas')} />
          </div>

          {editando !== 'novo' && editando.status !== 'Disponível' && (
            <p className="meta">
              O status deste animal é "{editando.status}" e não se edita aqui — quem
              muda é o processo de adoção.
            </p>
          )}

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

      {!lista && !erro && <Carregando />}
      {lista && lista.length === 0 && <p className="empty">Nenhum animal cadastrado ainda.</p>}

      {lista && lista.length > 0 && (
        <div className="card stack">
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Nome</th><th>Espécie</th><th>Idade</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.nome}</td>
                    <td className="meta">{a.especie}</td>
                    <td className="meta">{a.idade || '—'}</td>
                    <td><Pill>{a.status}</Pill></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn quiet sm" onClick={() => abrirEdicao(a)}>
                        <Icone nome="edit" tamanho={15} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
