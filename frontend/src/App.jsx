import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { ProvedorSessao, useSessao } from './sessao';
import { PainelOng, Protegida } from './componentes';
import Icone from './icones';
import Catalogo from './paginas/Catalogo';
import FichaAnimal from './paginas/FichaAnimal';
import Entrar from './paginas/Entrar';
import MinhasSolicitacoes from './paginas/MinhasSolicitacoes';
import DetalheSolicitacao from './paginas/DetalheSolicitacao';
import Painel from './paginas/Painel';
import FilaSolicitacoes from './paginas/FilaSolicitacoes';
import AnimaisDaOng from './paginas/AnimaisDaOng';
import Assistente from './paginas/Assistente';
import BaseConhecimento from './paginas/BaseConhecimento';

// A barra de cima é a navegação pública e do adotante. A da ONG fica na
// lateral, dentro das telas, como no protótipo.
function Topo() {
  const sessao = useSessao();
  const navegar = useNavigate();

  async function sair() {
    await sessao.sair();
    navegar('/');
  }

  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span className="mark"><Icone nome="paw" /></span>
        ConnectPatas
      </Link>

      <nav className="nav" aria-label="Navegação principal">
        <NavLink to="/" end>Adotar</NavLink>
        <NavLink to="/assistente">Assistente</NavLink>
        {sessao.adotante && <NavLink to="/minhas-solicitacoes">Minhas solicitações</NavLink>}
        {sessao.daOng && <NavLink to="/painel">Área da ONG</NavLink>}
      </nav>

      <span className="spacer" />

      <div className="rowx" style={{ gap: 8 }}>
        {sessao.usuario ? (
          <>
            <span className={sessao.daOng ? 'pill green' : 'pill grey'}>
              {sessao.daOng ? 'ONG · ' : ''}{sessao.usuario.nome}
            </span>
            <button className="btn quiet sm" onClick={sair}>Sair</button>
          </>
        ) : (
          <Link className="btn ghost sm" to="/entrar">Entrar</Link>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProvedorSessao>
        <div className="app">
          <Topo />
          <main className="wrap fade" tabIndex="-1">
            <Routes>
              <Route path="/" element={<Catalogo />} />
              <Route path="/animais/:id" element={<FichaAnimal />} />
              <Route path="/entrar" element={<Entrar />} />
              {/* UC11 — o assistente atende sem login. */}
              <Route path="/assistente" element={<Assistente />} />

              <Route path="/minhas-solicitacoes" element={
                <Protegida perfil="adotante"><MinhasSolicitacoes /></Protegida>
              } />

              {/* O detalhe atende os dois lados; o servidor confere de quem é. */}
              <Route path="/solicitacoes/:id" element={
                <Protegida><DetalheSolicitacao /></Protegida>
              } />

              <Route path="/solicitacoes" element={
                <Protegida perfil="ong"><PainelOng><FilaSolicitacoes /></PainelOng></Protegida>
              } />
              <Route path="/meus-animais" element={
                <Protegida perfil="ong"><PainelOng><AnimaisDaOng /></PainelOng></Protegida>
              } />
              <Route path="/painel" element={
                <Protegida perfil="responsavel"><PainelOng><Painel /></PainelOng></Protegida>
              } />
              <Route path="/base-conhecimento" element={
                <Protegida perfil="responsavel">
                  <PainelOng><BaseConhecimento /></PainelOng>
                </Protegida>
              } />

              <Route path="*" element={<NaoEncontrada />} />
            </Routes>
          </main>
          <p className="rodape">ConnectPatas — Projeto Integrador, IFSP Hortolândia</p>
        </div>
      </ProvedorSessao>
    </BrowserRouter>
  );
}

function NaoEncontrada() {
  return (
    <div className="card stack" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Página não encontrada</h2>
      <Link className="btn pri" to="/">Ir para o catálogo</Link>
    </div>
  );
}
