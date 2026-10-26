import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const Contexto = createContext(null);

// Quem está logado é pergunta para o servidor, não para o navegador.
// O cookie é httpOnly: a página não consegue lê-lo nem deve tentar.
// Ao abrir, perguntamos uma vez ao /auth/eu e guardamos em memória.
export function ProvedorSessao({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.eu()
      .then((d) => setUsuario(d.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  const valor = {
    usuario,
    carregando,
    daOng: usuario && usuario.tipoUsuario !== 'adotante',
    responsavel: usuario && usuario.tipoUsuario === 'responsavel_ong',
    adotante: usuario && usuario.tipoUsuario === 'adotante',
    async entrar(email, senha) {
      const d = await api.entrar(email, senha);
      setUsuario(d.usuario);
      return d.usuario;
    },
    async cadastrar(dados) {
      const d = await api.cadastrar(dados);
      setUsuario(d.usuario);
      return d.usuario;
    },
    async sair() {
      await api.sair();
      setUsuario(null);
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useSessao = () => useContext(Contexto);
