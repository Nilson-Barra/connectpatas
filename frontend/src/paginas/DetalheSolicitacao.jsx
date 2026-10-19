import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useSessao } from '../sessao';
import { Carregando, Erro, Etapas, Pill, Retrato } from '../componentes';
import Icone from '../icones';

// As mesmas transições da Figura 8 que o servidor aplica. Repetir aqui é só
// para não oferecer botão que vai dar erro — quem decide continua sendo a API.
const PROXIMOS = {
  'Pendente': ['Em análise', 'Recusada'],
  'Em análise': ['Aprovada', 'Recusada'],
  'Aprovada': ['Concluída', 'Recusada'],
};
const ROTULO = {
  'Em análise': 'Colocar em análise',
  'Aprovada': 'Aprovar',
  'Concluída': 'Concluir adoção',
  'Recusada': 'Recusar',
};

const hora = (d) =>
  new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function DetalheSolicitacao() {
  const { id } = useParams();
  const sessao = useSessao();
  const [solicitacao, setSolicitacao] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const fim = useRef(null);

  useEffect(() => {
    Promise.all([api.solicitacao(id), api.mensagens(id)])
      .then(([a, b]) => { setSolicitacao(a.solicitacao); setMensagens(b.mensagens); })
      .catch((e) => setErro(e.message));
  }, [id]);

  useEffect(() => {
    if (fim.current) fim.current.scrollIntoView({ block: 'nearest' });
  }, [mensagens.length]);

  // Recusar abre e fecha a caixa de motivo, sem recusar nada: só o "Enviar"
  // confirma. Fechar por aqui preserva o que já foi escrito — quem clicou sem
  // querer não perde o texto. Quem apaga de propósito é o "Cancelar".
  function alternarMotivo() {
    setErro('');
    setRecusando((aberta) => !aberta);
  }

  function desistirDaRecusa() {
    setRecusando(false);
    setMotivo('');
  }

  async function mudar(status, observacoes) {
    setErro('');
    setOcupado(true);
    try {
      const d = await api.mudarStatus(id, status, observacoes);
      setSolicitacao(d.solicitacao);
      setRecusando(false);
      setMotivo('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setErro('');
    setOcupado(true);
    try {
      const d = await api.enviarMensagem(id, texto);
      setMensagens(d.mensagens);
      setTexto('');
    } catch (erroApi) {
      setErro(erroApi.message);
    } finally {
      setOcupado(false);
    }
  }

  if (erro && !solicitacao) {
    return (
      <div className="card stack" style={{ maxWidth: 460, margin: '40px auto' }}>
        <h2>Não foi possível abrir esta solicitação</h2>
        <p className="lede">{erro}</p>
      </div>
    );
  }
  if (!solicitacao) return <Carregando />;

  const { animal, adotante } = solicitacao;
  const encerrada = ['Concluída', 'Recusada'].includes(solicitacao.status);
  const acoes = (sessao.daOng && PROXIMOS[solicitacao.status]) || [];
  const dados = [
    ['Nome', adotante?.usuario?.nome],
    ['E-mail', adotante?.usuario?.email],
    ['Telefone', solicitacao.telefoneContato],
    ['Moradia', solicitacao.moradia],
    ['Outros animais', solicitacao.outrosAnimais],
    ['Disponibilidade', solicitacao.disponibilidade],
  ];

  return (
    <>
      <Link
        to={sessao.daOng ? '/solicitacoes' : '/minhas-solicitacoes'}
        className="rowx"
        style={{ gap: 7, fontWeight: 600, fontSize: 14, color: 'var(--muted)' }}
      >
        <Icone nome="back" tamanho={16} /> Voltar
      </Link>

      <div className="head" style={{ alignItems: 'center' }}>
        <div style={{ width: 86, flex: 'none' }}><Retrato id={animal.id} /></div>
        <div className="stack" style={{ gap: 4, flexGrow: 1 }}>
          <h1>{animal.nome}</h1>
          <p className="meta">
            Solicitação #{solicitacao.id} ·{' '}
            {[animal.especie, animal.idade, animal.porte].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Pill>{solicitacao.status}</Pill>
      </div>

      <Erro>{erro}</Erro>

      <div className="cols" style={{ gridTemplateColumns: '300px minmax(0, 1fr)' }}>
        <div className="stack">
          <div className="card stack">
            <span className="eyebrow">Andamento</span>
            <Etapas
              etapa={solicitacao.etapa}
              status={solicitacao.status}
              data={new Date(solicitacao.dataSolicitacao).toLocaleDateString('pt-BR')}
            />
            {solicitacao.status === 'Recusada' && solicitacao.observacoes && (
              <>
                <hr className="hr" />
                <p className="meta">{solicitacao.observacoes}</p>
              </>
            )}
          </div>

          {acoes.length > 0 && (
            <div className="card stack">
              <span className="eyebrow">Próximo passo</span>
              {acoes.map((status) => (
                <button
                  key={status}
                  className={status === 'Recusada' ? 'btn danger cheio' : 'btn pri'}
                  onClick={() => (status === 'Recusada' ? alternarMotivo() : mudar(status))}
                  disabled={ocupado || (recusando && status !== 'Recusada')}
                  aria-expanded={status === 'Recusada' ? recusando : undefined}
                >
                  <Icone nome={status === 'Recusada' ? 'x' : 'check'} tamanho={17} />
                  {ROTULO[status]}
                </button>
              ))}

              {recusando && (
                <form
                  className="stack"
                  style={{ gap: 10 }}
                  onSubmit={(e) => { e.preventDefault(); mudar('Recusada', motivo.trim() || undefined); }}
                >
                  <div className="f">
                    <label htmlFor="motivo">Motivo do cancelamento :</label>
                    <textarea
                      id="motivo"
                      className="fixa"
                      rows="5"
                      autoFocus
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Escreva aqui o que deve ser enviado ao adotante."
                    />
                  </div>
                  <div className="rowx" style={{ gap: 8 }}>
                    <button className="btn danger sm" type="submit" disabled={ocupado}>
                      {ocupado ? 'Enviando…' : 'Enviar'}
                    </button>
                    <button
                      className="btn quiet sm"
                      type="button"
                      onClick={desistirDaRecusa}
                      disabled={ocupado}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {sessao.daOng && encerrada && (
            <p className="meta">Este processo está encerrado e não aceita mais mudanças.</p>
          )}
        </div>

        <div className="stack">
          {/* Para a ONG, o que interessa é quem é a pessoa (UC06). */}
          {sessao.daOng && (
            <div className="card stack">
              <h2>Quem pediu</h2>
              <div className="grid" style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14,
              }}>
                {dados.map(([k, v]) => (
                  <span className="stack" style={{ gap: 2 }} key={k}>
                    <span className="eyebrow">{k}</span>
                    <span>{v || '—'}</span>
                  </span>
                ))}
              </div>
              {solicitacao.observacoes && solicitacao.status !== 'Recusada' && (
                <>
                  <hr className="hr" />
                  <div className="stack" style={{ gap: 3 }}>
                    <span className="eyebrow">Mensagem do adotante</span>
                    <span>{solicitacao.observacoes}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* UC08 — conversa presa à solicitação. */}
          <div className="card stack">
            <div className="rowx" style={{ gap: 11 }}>
              <span className="mark" style={{ background: 'var(--pri-soft)' }}>
                <span style={{ color: 'var(--pri)' }}><Icone nome="chat" tamanho={17} /></span>
              </span>
              <span className="stack" style={{ gap: 1, flexGrow: 1 }}>
                <strong>Conversa</strong>
                <span className="meta">
                  {sessao.daOng ? 'Com o adotante' : 'Com a equipe da ONG'}
                </span>
              </span>
            </div>
            <hr className="hr" />

            <div className="msgs" aria-live="polite">
              {mensagens.length === 0 && (
                <p className="meta">Ainda não há mensagens nesta solicitação.</p>
              )}
              {mensagens.map((m) => (
                <span
                  className={m.idRemetente === sessao.usuario.id ? 'bub me' : 'bub them'}
                  key={m.id}
                >
                  {m.conteudo}
                  <span className="t">
                    {m.remetente?.nome?.split(' ')[0]} · {hora(m.dataEnvio)}
                  </span>
                </span>
              ))}
              <span ref={fim} />
            </div>

            {encerrada ? (
              <p className="meta">A conversa fecha junto com o processo.</p>
            ) : (
              <form className="rowx" style={{ gap: 9, flexWrap: 'nowrap' }} onSubmit={enviar}>
                <label className="f" style={{ flexGrow: 1 }}>
                  <span className="eyebrow oculto">Mensagem</span>
                  <input
                    type="text"
                    placeholder="Escreva uma mensagem"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                  />
                </label>
                <button
                  className="btn pri"
                  type="submit"
                  aria-label="Enviar mensagem"
                  style={{ width: 44, padding: 0 }}
                  disabled={ocupado || !texto.trim()}
                >
                  <Icone nome="send" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
