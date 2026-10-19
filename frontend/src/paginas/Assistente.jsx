import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Erro } from '../componentes';
import Icone from '../icones';

const SUGESTOES = [
  'Quais vacinas são anuais?',
  'Quanto custa manter um cão?',
  'Como apresentar o gato novo à casa?',
  'Meu gato pode comer chocolate?',
];

const ABERTURA = {
  origem: 'agente',
  conteudo: 'Oi! Posso ajudar com dúvidas sobre cuidados, alimentação, vacinação, '
    + 'comportamento e sobre o processo de adoção. O que você quer saber?',
  fontes: [],
};

// UC11 — o assistente atende qualquer pessoa, com ou sem login. É a porta de
// entrada de quem ainda está decidindo se tem condições de adotar.
export default function Assistente() {
  const [mensagens, setMensagens] = useState([ABERTURA]);
  const [pergunta, setPergunta] = useState('');
  const [idConversa, setIdConversa] = useState(null);
  const [escalada, setEscalada] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const fim = useRef(null);

  useEffect(() => {
    if (fim.current) fim.current.scrollIntoView({ block: 'nearest' });
  }, [mensagens.length, ocupado]);

  async function enviar(texto) {
    const t = (texto || '').trim();
    if (!t || ocupado) return;
    setErro('');
    setPergunta('');
    setMensagens((m) => [...m, { origem: 'usuario', conteudo: t }]);
    setOcupado(true);
    try {
      const r = await api.perguntar(t, idConversa);
      setIdConversa(r.idConversa);
      setMensagens((m) => [...m, {
        origem: 'agente',
        conteudo: r.conteudo,
        fontes: r.fontes || [],
        confianca: r.confianca,
        ofereceEscalar: r.ofereceEscalar,
      }]);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  // UC12 — quando o agente não sabe, quem responde é gente.
  async function encaminhar() {
    if (!idConversa) return;
    setErro('');
    setOcupado(true);
    try {
      await api.escalar(idConversa);
      setEscalada(true);
      setMensagens((m) => [...m, {
        origem: 'agente',
        conteudo: 'Encaminhei sua dúvida para a equipe da ONG. Eles respondem por aqui '
          + 'assim que puderem.',
        fontes: [],
      }]);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const ultima = mensagens[mensagens.length - 1];
  const podeEscalar = !escalada && ultima && ultima.origem === 'agente' && ultima.ofereceEscalar;

  return (
    <>
      <div className="head">
        <div className="stack" style={{ gap: 5, flexGrow: 1 }}>
          <h1>Assistente de cuidados</h1>
          <p>Responde a partir do material validado pela ONG</p>
        </div>
        {escalada && <span className="pill amber">Dúvida encaminhada à ONG</span>}
      </div>

      <div className="cols" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px' }}>
        <div className="card stack">
          {/* RNF12 — o aviso fica visível o tempo todo, não só na primeira vez. */}
          <div className="notice">
            <Icone nome="alert" tamanho={18} />
            <span>
              <strong>Orientação informativa.</strong> O assistente responde com o
              conteúdo validado pela ONG e não substitui a avaliação de um médico
              veterinário. Em caso de urgência, procure atendimento.
            </span>
          </div>

          <div className="msgs" aria-live="polite">
            {mensagens.map((m, i) => (
              m.origem === 'usuario' ? (
                <span className="bub me" key={i}>{m.conteudo}</span>
              ) : (
                <div className="ia" key={i}>
                  <span className="av"><Icone nome="spark" tamanho={17} /></span>
                  <div className="corpo">
                    <span>{m.conteudo}</span>
                    {m.fontes && m.fontes.length > 0 && (
                      <span className="src">
                        <span className="eyebrow">Fontes</span>
                        {m.fontes.map((f) => (
                          <span className="tag" key={f.id} title={`${f.fonte} · validado por ${f.validadoPor}`}>
                            <Icone nome="book" tamanho={13} />{f.titulo}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              )
            ))}

            {ocupado && (
              <div className="ia">
                <span className="av"><Icone nome="spark" tamanho={17} /></span>
                <div className="corpo"><span className="meta">Procurando na base…</span></div>
              </div>
            )}
            <span ref={fim} />
          </div>

          <Erro>{erro}</Erro>

          {podeEscalar && (
            <div className="rowx">
              <button className="btn quiet sm" onClick={encaminhar} disabled={ocupado}>
                <Icone nome="send" tamanho={15} /> Encaminhar para a ONG
              </button>
            </div>
          )}

          <div className="chips">
            {SUGESTOES.map((s) => (
              <button className="chip" key={s} onClick={() => enviar(s)} disabled={ocupado}>
                {s}
              </button>
            ))}
          </div>

          <form
            className="rowx"
            style={{ gap: 9, flexWrap: 'nowrap' }}
            onSubmit={(e) => { e.preventDefault(); enviar(pergunta); }}
          >
            <label className="f" style={{ flexGrow: 1 }}>
              <span className="eyebrow oculto">Sua dúvida</span>
              <input
                type="text"
                autoComplete="off"
                placeholder="Escreva sua dúvida sobre cuidados com o animal"
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
              />
            </label>
            <button
              className="btn pri"
              type="submit"
              aria-label="Enviar pergunta"
              style={{ width: 44, padding: 0 }}
              disabled={ocupado || !pergunta.trim()}
            >
              <Icone nome="send" />
            </button>
          </form>
        </div>

        <div className="card stack sticky">
          <h2>Como funciona</h2>
          {[
            'Sua pergunta é comparada com os itens da base mantida pela ONG.',
            'A resposta é montada só com esses itens, e as fontes ficam visíveis abaixo dela.',
            'Sem informação suficiente, a dúvida é encaminhada para a equipe da ONG.',
          ].map((t, i) => (
            <div className="step" key={t}>
              <span className="dot on" style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
              <span className="meta" style={{ color: 'var(--ink)' }}>{t}</span>
            </div>
          ))}
          <hr className="hr" />
          <p className="meta rowx" style={{ gap: 9, alignItems: 'flex-start' }}>
            <Icone nome="shield" tamanho={17} />
            <span style={{ flex: 1, minWidth: 0 }}>
              Nenhum dado pessoal seu é enviado a serviços externos.
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
