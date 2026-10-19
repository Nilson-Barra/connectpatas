import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Carregando, Erro, Pill } from '../componentes';

const FILTROS = ['', 'Pendente', 'Em análise', 'Aprovada', 'Concluída', 'Recusada'];
const data = (d) => new Date(d).toLocaleDateString('pt-BR');

// UC06 — a fila de trabalho da ONG.
export default function FilaSolicitacoes() {
  const navegar = useNavigate();
  const [status, setStatus] = useState('');
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLista(null);
    api.filaDaOng(status)
      .then((d) => setLista(d.solicitacoes))
      .catch((e) => setErro(e.message));
  }, [status]);

  return (
    <>
      <div className="head">
        <div className="stack" style={{ gap: 5, flexGrow: 1 }}>
          <h1>Solicitações de adoção</h1>
          <p>
            {lista
              ? `${lista.length} ${lista.length === 1 ? 'solicitação' : 'solicitações'}${status ? ` com status "${status}"` : ''}`
              : 'Carregando…'}
          </p>
        </div>
      </div>

      <div className="chips">
        {FILTROS.map((f) => (
          <button
            key={f || 'todas'}
            className="chip"
            aria-pressed={status === f}
            onClick={() => setStatus(f)}
          >
            {f || 'Todas'}
          </button>
        ))}
      </div>

      <Erro>{erro}</Erro>
      {!lista && !erro && <Carregando />}

      {lista && lista.length === 0 && (
        <p className="empty">Nada aqui{status ? ` com o status "${status}"` : ''}.</p>
      )}

      {lista && lista.length > 0 && (
        <div className="card stack">
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Interessado</th><th>Animal</th><th>Data</th><th>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.adotante?.usuario?.nome || '—'}</td>
                    <td className="meta">{s.animal.nome}</td>
                    <td className="meta">{data(s.dataSolicitacao)}</td>
                    <td><Pill>{s.status}</Pill></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn quiet sm"
                        onClick={() => navegar(`/solicitacoes/${s.id}`)}
                      >
                        Abrir
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
