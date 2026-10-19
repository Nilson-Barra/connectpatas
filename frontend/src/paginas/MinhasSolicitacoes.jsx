import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Carregando, Erro, Etapas, Pill, Retrato } from '../componentes';

const data = (d) => new Date(d).toLocaleDateString('pt-BR');

// UC07 pelo lado de quem pediu: onde o processo está e o que falta.
export default function MinhasSolicitacoes() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.minhasSolicitacoes()
      .then((d) => setLista(d.solicitacoes))
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <Erro>{erro}</Erro>;
  if (!lista) return <Carregando />;

  if (!lista.length) {
    return (
      <>
        <h1>Minhas solicitações</h1>
        <p className="empty">
          Você ainda não solicitou nenhuma adoção.{' '}
          <Link to="/">Ver os animais disponíveis</Link>.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="head">
        <div className="stack" style={{ gap: 5, flexGrow: 1 }}>
          <h1>Minhas solicitações</h1>
          <p>
            {lista.length} {lista.length === 1 ? 'processo' : 'processos'} com a ONG
          </p>
        </div>
      </div>

      {lista.map((s) => (
        <div className="stack" style={{ gap: 14 }} key={s.id}>
          <div className="head" style={{ alignItems: 'center' }}>
            <div className="stack" style={{ gap: 3, flexGrow: 1 }}>
              <h2>{s.animal.nome}</h2>
              <p className="meta">
                Solicitação #{s.id} · enviada em {data(s.dataSolicitacao)}
              </p>
            </div>
            <Pill>{s.status}</Pill>
          </div>

          <div className="cols">
            <div className="card stack">
              <span className="eyebrow">Andamento</span>
              <Etapas etapa={s.etapa} status={s.status} data={data(s.dataSolicitacao)} />
              <hr className="hr" />
              <p className="meta">A ONG avisa por aqui a cada mudança de etapa.</p>
            </div>

            <Link className="animal" to={`/solicitacoes/${s.id}`} style={{ padding: 16 }}>
              <div className="rowx" style={{ gap: 14, flexWrap: 'nowrap' }}>
                <div style={{ width: 92, flex: 'none' }}><Retrato id={s.animal.id} /></div>
                <span className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <span className="nm">{s.animal.nome}</span>
                  <span className="meta">
                    {[s.animal.especie, s.animal.idade, s.animal.porte]
                      .filter(Boolean).join(' · ')}
                  </span>
                  <span className="meta" style={{ color: 'var(--pri)', fontWeight: 600 }}>
                    Abrir conversa com a ONG
                  </span>
                </span>
              </div>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}
