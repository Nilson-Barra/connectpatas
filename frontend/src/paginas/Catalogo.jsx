import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Carregando, Erro, Pill, Retrato, Vazio } from '../componentes';

// UC04 — consulta pública. Não exige login: é a porta de entrada de quem
// chega pelo cartaz ou pelo Instagram da ONG.
export default function Catalogo() {
  const [filtros, setFiltros] = useState({ texto: '', especie: '', porte: '' });
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [maisCarregando, setMaisCarregando] = useState(false);

  // Filtro novo recomeça da primeira página.
  useEffect(() => {
    let atual = true;
    setErro('');
    // Pequena espera: filtrar a cada tecla digitada bate na API à toa.
    const t = setTimeout(() => {
      api.catalogo(filtros)
        .then((d) => { if (atual) { setDados(d); setPagina(1); } })
        .catch((e) => { if (atual) setErro(e.message); });
    }, 250);
    return () => { atual = false; clearTimeout(t); };
  }, [filtros.texto, filtros.especie, filtros.porte]);

  // A API entrega 12 por vez; o botão busca a próxima leva e soma à lista.
  async function verMais() {
    setMaisCarregando(true);
    try {
      const d = await api.catalogo({ ...filtros, pagina: pagina + 1 });
      setDados((atual) => ({ ...d, animais: [...atual.animais, ...d.animais] }));
      setPagina(pagina + 1);
    } catch (e) {
      setErro(e.message);
    } finally {
      setMaisCarregando(false);
    }
  }

  const mudar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value });
  const total = dados ? dados.total : 0;

  return (
    <>
      <div className="head">
        <div className="stack" style={{ gap: 5, flexGrow: 1 }}>
          <h1>Animais para adoção</h1>
          <p>
            {dados
              ? `${total} ${total === 1 ? 'animal disponível' : 'animais disponíveis'} · animais em processo de adoção saem da lista`
              : 'Carregando o catálogo…'}
          </p>
        </div>
      </div>

      <div className="card flat">
        <div className="fields">
          <div className="f">
            <label htmlFor="fx">Buscar</label>
            <input id="fx" type="search" placeholder="Nome, raça ou característica"
                   value={filtros.texto} onChange={mudar('texto')} />
          </div>
          <div className="f">
            <label htmlFor="fe">Espécie</label>
            <select id="fe" value={filtros.especie} onChange={mudar('especie')}>
              <option value="">Todas</option>
              <option>Canina</option><option>Felina</option><option>Outra</option>
            </select>
          </div>
          <div className="f">
            <label htmlFor="fp">Porte</label>
            <select id="fp" value={filtros.porte} onChange={mudar('porte')}>
              <option value="">Todos</option>
              <option>Pequeno</option><option>Médio</option><option>Grande</option>
            </select>
          </div>
        </div>
      </div>

      <Erro>{erro}</Erro>
      {!dados && !erro && <Carregando />}

      {dados && dados.animais.length === 0 && (
        <Vazio>Nenhum animal com esses filtros. Tente limpar a busca.</Vazio>
      )}

      {dados && dados.animais.length > 0 && (
        <div className="grid g4">
          {dados.animais.map((a) => (
            <Link className="animal" to={`/animais/${a.id}`} key={a.id}>
              <Retrato id={a.id} foto={a.fotografia} nome={a.nome} />
              <span className="rowx" style={{ gap: 9 }}>
                <span className="nm" style={{ flexGrow: 1 }}>{a.nome}</span>
                <Pill>{a.status}</Pill>
              </span>
              <span className="meta">
                {[a.especie, a.idade, a.porte && `porte ${a.porte.toLowerCase()}`]
                  .filter(Boolean).join(' · ')}
              </span>
            </Link>
          ))}
        </div>
      )}

      {dados && dados.animais.length < total && (
        <div className="rowx" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button className="btn quiet" onClick={verMais} disabled={maisCarregando}>
            {maisCarregando
              ? 'Carregando…'
              : `Ver mais animais (${total - dados.animais.length} restantes)`}
          </button>
        </div>
      )}
    </>
  );
}
