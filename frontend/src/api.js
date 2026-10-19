// Única porta de saída para a API. Todo fetch passa por aqui, então
// 'credentials' e o tratamento de erro ficam num lugar só.
//
// credentials: 'include' é obrigatório: sem isso o navegador não manda o
// cookie de sessão e tudo que é privado volta 401.
async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(`/api${caminho}`, {
    credentials: 'include',
    headers: opcoes.corpo ? { 'Content-Type': 'application/json' } : undefined,
    method: opcoes.metodo || 'GET',
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });

  if (resposta.status === 204) return null;

  let dados = null;
  try { dados = await resposta.json(); } catch { /* resposta sem corpo */ }

  if (!resposta.ok) {
    const e = new Error((dados && dados.erro) || 'Não foi possível completar a operação.');
    e.status = resposta.status;
    e.detalhes = dados && dados.detalhes;
    throw e;
  }
  return dados;
}

export const api = {
  // sessão
  entrar: (email, senha) => pedir('/auth/login', { metodo: 'POST', corpo: { email, senha } }),
  sair: () => pedir('/auth/logout', { metodo: 'POST' }),
  eu: () => pedir('/auth/eu'),

  // catálogo público (UC04)
  catalogo: (filtros = {}) => {
    const q = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== '' && v != null)
    );
    return pedir(`/publico/animais${q.toString() ? `?${q}` : ''}`);
  },
  animalPublico: (id) => pedir(`/publico/animais/${id}`),

  // área da ONG (UC02, UC03)
  ong: () => pedir('/ong'),
  painel: () => pedir('/painel'),
  animaisDaOng: (status) => pedir(`/animais${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  animal: (id) => pedir(`/animais/${id}`),
  criarAnimal: (dados) => pedir('/animais', { metodo: 'POST', corpo: dados }),
  salvarAnimal: (id, dados) => pedir(`/animais/${id}`, { metodo: 'PUT', corpo: dados }),

  // assistente de cuidados (UC11 a UC13)
  perguntar: (pergunta, idConversa) =>
    pedir('/assistente/perguntar', { metodo: 'POST', corpo: { pergunta, idConversa } }),
  escalar: (idConversa) =>
    pedir(`/assistente/conversas/${idConversa}/escalar`, { metodo: 'POST' }),
  duvidasEscaladas: () => pedir('/assistente/escaladas'),
  responderDuvida: (idConversa, conteudo) =>
    pedir(`/assistente/conversas/${idConversa}/responder`, { metodo: 'POST', corpo: { conteudo } }),
  baseConhecimento: (filtros = {}) => {
    const q = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => v !== '' && v != null)
    );
    return pedir(`/base-conhecimento${q.toString() ? `?${q}` : ''}`);
  },
  criarItem: (dados) => pedir('/base-conhecimento', { metodo: 'POST', corpo: dados }),
  salvarItem: (id, dados) => pedir(`/base-conhecimento/${id}`, { metodo: 'PUT', corpo: dados }),

  // adoções (UC05 a UC08)
  solicitar: (idAnimal, dados) =>
    pedir(`/animais/${idAnimal}/solicitacoes`, { metodo: 'POST', corpo: dados }),
  minhasSolicitacoes: () => pedir('/minhas-solicitacoes'),
  filaDaOng: (status) =>
    pedir(`/solicitacoes${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  solicitacao: (id) => pedir(`/solicitacoes/${id}`),
  mudarStatus: (id, status, observacoes) =>
    pedir(`/solicitacoes/${id}/status`, { metodo: 'PUT', corpo: { status, observacoes } }),
  mensagens: (id) => pedir(`/solicitacoes/${id}/mensagens`),
  enviarMensagem: (id, conteudo) =>
    pedir(`/solicitacoes/${id}/mensagens`, { metodo: 'POST', corpo: { conteudo } }),
};
