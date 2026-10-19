import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Carregando, Erro, Pill } from '../componentes';
import Icone from '../icones';

const data = (d) => new Date(d).toLocaleDateString('pt-BR');

// UC09 — visão do responsável. Números que respondem "como estamos?",
// não um amontoado de gráficos.
export default function Painel() {
  const [dados, setDados] = useState(null);
  const [ong, setOng] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api.painel(), api.ong(), api.filaDaOng()])
      .then(([p, o, f]) => {
        setDados(p); setOng(o.ong); setRecentes(f.solicitacoes.slice(0, 5));
      })
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <Erro>{erro}</Erro>;
  if (!dados) return <Carregando />;

  const { animais, solicitacoes } = dados;
  const kpis = [
    ['Animais acolhidos', animais.total, 'paw'],
    ['Disponíveis', animais['Disponível'], 'check'],
    ['Em processo', animais['Em processo de adoção'], 'clock'],
    ['Adoções concluídas', animais['Adotado'], 'chart'],
  ];

  return (
    <>
      <div className="head">
        <div className="stack" style={{ gap: 5, flexGrow: 1 }}>
          <h1>Painel de acompanhamento</h1>
          <p>{ong ? `${ong.nome} · ${ong.cidade}` : 'Visão geral'}</p>
        </div>
        {/* Leva para a lista de animais já com o formulário aberto: quem clica
            aqui quer cadastrar, não quer clicar de novo. */}
        <Link className="btn pri" to="/meus-animais?novo=1">
          <Icone nome="plus" tamanho={17} /> Cadastrar animal
        </Link>
      </div>

      {/* 4 colunas cabem na largura que sobra ao lado da barra lateral */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))' }}>
        {kpis.map(([t, v, ic]) => (
          <div className="card kpi" key={t}>
            <span className="rowx" style={{ gap: 9 }}>
              <span className="mark" style={{ background: 'var(--pri-soft)', width: 30, height: 30 }}>
                <span style={{ color: 'var(--pri)' }}><Icone nome={ic} tamanho={16} /></span>
              </span>
              <span className="meta">{t}</span>
            </span>
            <span className="n">{v ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="cols" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px' }}>
        <div className="card stack">
          <div className="rowx">
            <h2 style={{ flexGrow: 1 }}>Solicitações recentes</h2>
            <Link to="/solicitacoes" style={{ fontSize: '13.5px', fontWeight: 600 }}>
              Ver todas
            </Link>
          </div>
          {recentes.length === 0 ? (
            <p className="empty">Nenhuma solicitação ainda.</p>
          ) : (
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>Interessado</th><th>Animal</th><th>Data</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentes.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.adotante?.usuario?.nome || '—'}</td>
                      <td className="meta">{s.animal.nome}</td>
                      <td className="meta">{data(s.dataSolicitacao)}</td>
                      <td><Pill>{s.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card stack">
          <h2>Fila de adoções</h2>
          <div className="stack" style={{ gap: 12 }}>
            {[
              [solicitacoes['Pendente'], 'aguardando a primeira resposta'],
              [solicitacoes['Em análise'], 'em análise'],
              [solicitacoes['Aprovada'], 'aprovadas, aguardando a entrega'],
            ].map(([v, t]) => (
              <span className="kpi" key={t}>
                <span className="n" style={{ fontSize: 24, color: 'var(--pri)' }}>{v ?? 0}</span>
                <span className="meta">{t}</span>
              </span>
            ))}
          </div>
          <hr className="hr" />
          <Link className="btn quiet" to="/solicitacoes">
            <Icone nome="list" tamanho={17} /> Abrir a fila
          </Link>
        </div>
      </div>
    </>
  );
}
