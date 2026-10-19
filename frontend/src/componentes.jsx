import { NavLink, Navigate } from 'react-router-dom';
import { useSessao } from './sessao';
import Icone from './icones';

// Peças pequenas que aparecem em várias telas. Componente de uma tela só
// mora no arquivo da tela.

export function Carregando({ texto = 'Carregando…' }) {
  return <p className="empty">{texto}</p>;
}

export function Erro({ children }) {
  if (!children) return null;
  return (
    <div className="notice" role="alert">
      <Icone nome="alert" tamanho={18} />
      <span>{children}</span>
    </div>
  );
}

export function Vazio({ children }) {
  return <p className="empty">{children}</p>;
}

// Status do animal e status da solicitação usam a mesma escala de cor:
// verde é desfecho bom, âmbar é em andamento, cinza é encerrado.
const COR = {
  'Disponível': 'green',
  'Em processo de adoção': 'amber',
  'Adotado': 'grey',
  'Pendente': 'amber',
  'Em análise': 'amber',
  'Aprovada': 'green',
  'Concluída': 'green',
  'Recusada': 'clay',
};

export function Pill({ children, cor }) {
  return <span className={`pill ${cor || COR[children] || 'grey'}`}>{children}</span>;
}

// Retrato do animal. O campo de foto existe no banco (RF03) mas ainda não há
// upload, então desenhamos a pata sobre uma das seis tintas da paleta. O
// índice vem do id: o mesmo animal fica sempre com a mesma cor.
export function Retrato({ id, estilo }) {
  const tinta = `var(--t${(Number(id) % 6) + 1})`;
  return (
    <div className="thumb" style={{ background: tinta, ...estilo }} aria-hidden="true">
      <span style={{ color: 'var(--thumb-ink)' }}>
        <Icone nome="paw" tamanho={42} traco={1.3} />
      </span>
    </div>
  );
}

// Etapas do processo de adoção (UC07), com os nomes do diagrama de máquina
// de estados. A etapa vem do servidor; a tela só desenha.
const ETAPAS = [
  'Solicitação recebida',
  'Análise do perfil',
  'Entrevista ou visita',
  'Adoção concluída',
];

export function Etapas({ etapa, status, data }) {
  if (status === 'Recusada') {
    return (
      <div className="step">
        <span className="dot"><Icone nome="x" tamanho={13} traco={2.4} /></span>
        <span className="stack" style={{ gap: 1 }}>
          <span style={{ fontWeight: 600, fontSize: '14.5px' }}>Processo encerrado</span>
          <span className="meta">A ONG recusou esta solicitação</span>
        </span>
      </div>
    );
  }
  return (
    <>
      {ETAPAS.map((nome, i) => (
        <div className="step" key={nome}>
          <span className={i < etapa ? 'dot on' : 'dot'}>
            {i < etapa && <Icone nome="check" tamanho={13} traco={2.4} />}
          </span>
          <span className="stack" style={{ gap: 1 }}>
            <span style={{
              fontWeight: 600, fontSize: '14.5px',
              color: i < etapa ? 'inherit' : 'var(--muted)',
            }}>
              {nome}
            </span>
            <span className="meta">
              {i === 0 && data ? data : i < etapa ? 'concluída' : 'aguardando'}
            </span>
          </span>
        </div>
      ))}
    </>
  );
}

// Barra lateral da área da ONG, como no protótipo: o trabalho interno fica
// numa navegação própria, separada da navegação pública.
const ITENS = [
  ['/painel', 'Painel', 'chart', 'responsavel'],
  ['/meus-animais', 'Animais', 'paw'],
  ['/solicitacoes', 'Solicitações', 'list'],
  ['/base-conhecimento', 'Base de conhecimento', 'book', 'responsavel'],
];

export function LateralOng() {
  const s = useSessao();
  return (
    <nav className="card flat stack sticky" style={{ gap: 3, padding: 12 }} aria-label="Área da ONG">
      <span className="eyebrow" style={{ padding: '6px 12px 8px' }}>Área da ONG</span>
      {ITENS.filter(([, , , perfil]) => !perfil || s.responsavel).map(([para, texto, icone]) => (
        <NavLink key={para} to={para} className="sideitem">
          <Icone nome={icone} /><span>{texto}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// Envolve as telas da ONG na grade de duas colunas.
export function PainelOng({ children }) {
  return (
    <div className="cols">
      <LateralOng />
      <div className="stack" style={{ gap: 18 }}>{children}</div>
    </div>
  );
}

// Rota que exige sessão. 'perfil' aceita 'ong', 'responsavel' ou 'adotante'.
export function Protegida({ perfil, children }) {
  const s = useSessao();
  if (s.carregando) return <Carregando />;
  if (!s.usuario) return <Navigate to="/entrar" replace />;
  if (perfil === 'ong' && !s.daOng) return <SemPermissao />;
  if (perfil === 'responsavel' && !s.responsavel) return <SemPermissao />;
  if (perfil === 'adotante' && !s.adotante) return <SemPermissao />;
  return children;
}

function SemPermissao() {
  return (
    <div className="card stack" style={{ maxWidth: 460, margin: '40px auto' }}>
      <h2>Esta área não é do seu perfil</h2>
      <p className="lede">
        O acesso é definido pelo tipo da sua conta. Se acha que é engano, fale com
        o responsável pela ONG.
      </p>
    </div>
  );
}
