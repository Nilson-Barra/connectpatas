// Proteções de borda, vindas da primeira rodada da esteira de segurança
// (SAST + verificação passiva equivalente ao ZAP baseline). Escritas à mão,
// sem dependência nova: são poucas linhas e cada uma diz o que fecha.

// Cabeçalhos que o ZAP baseline cobra em toda resposta.
function cabecalhos(_req, res, next) {
  // O navegador não "adivinha" o tipo do arquivo: um texto enviado por
  // usuário não vira script por engano (ZAP 10021).
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // A página não pode ser embutida em outro site — fecha clickjacking (ZAP 10020).
  res.setHeader('X-Frame-Options', 'DENY');
  // Ao sair do ConnectPatas por um link, o endereço interno não vai junto.
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}

// A API só devolve JSON, então a política de conteúdo pode ser a mais
// fechada possível (ZAP 10038). Quando o Express passar a servir as telas,
// as telas ganham a política delas; esta fica só em /api.
function politicaDaApi(_req, res, next) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  next();
}

// Freio de força bruta no login. Conta só as tentativas que FALHAM, por IP e
// e-mail juntos: quem acerta a senha não é atrapalhado, e um atacante não
// tranca a conta dos outros a partir de outro endereço.
//
// Fica em memória, o que basta para uma instância só (o MVP). Com mais de
// uma instância o contador precisa ir para o banco — anotado na Seção 10.
const JANELA_MS = 15 * 60 * 1000;
const MAXIMO = 10;
const falhas = new Map();

const chave = (req, email) => `${req.ip}|${String(email || '').toLowerCase()}`;

function bloqueado(req, email) {
  const k = chave(req, email);
  const r = falhas.get(k);
  if (!r) return 0;
  if (Date.now() - r.inicio > JANELA_MS) { falhas.delete(k); return 0; }
  return r.total >= MAXIMO ? Math.ceil((r.inicio + JANELA_MS - Date.now()) / 1000) : 0;
}

function registrarFalha(req, email) {
  const k = chave(req, email);
  const r = falhas.get(k);
  if (!r || Date.now() - r.inicio > JANELA_MS) falhas.set(k, { inicio: Date.now(), total: 1 });
  else r.total += 1;
  // Poda simples para o mapa não crescer sem limite.
  if (falhas.size > 10000) {
    const agora = Date.now();
    for (const [kk, v] of falhas) if (agora - v.inicio > JANELA_MS) falhas.delete(kk);
  }
}

function limparFalhas(req, email) {
  falhas.delete(chave(req, email));
}

// Freio de criação de contas. Sem ele, um script cria milhares de contas
// falsas por minuto. Conta só os cadastros que deram certo, por IP: uma
// família inteira no mesmo wi-fi ainda consegue criar as contas dela.
const JANELA_CADASTRO_MS = 60 * 60 * 1000;
const MAXIMO_CADASTROS = 5;
const cadastros = new Map();

function cadastroBloqueado(req) {
  const r = cadastros.get(req.ip);
  if (!r) return 0;
  if (Date.now() - r.inicio > JANELA_CADASTRO_MS) { cadastros.delete(req.ip); return 0; }
  return r.total >= MAXIMO_CADASTROS
    ? Math.ceil((r.inicio + JANELA_CADASTRO_MS - Date.now()) / 1000) : 0;
}

function registrarCadastro(req) {
  const r = cadastros.get(req.ip);
  if (!r || Date.now() - r.inicio > JANELA_CADASTRO_MS) {
    cadastros.set(req.ip, { inicio: Date.now(), total: 1 });
  } else r.total += 1;
}

// Só os testes usam: cada bloco de teste começa com o contador zerado.
const zerarCadastros = () => cadastros.clear();

module.exports = {
  cabecalhos, politicaDaApi, bloqueado, registrarFalha, limparFalhas, MAXIMO,
  cadastroBloqueado, registrarCadastro, zerarCadastros,
};
