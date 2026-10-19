// Recuperação e guardrails do agente (Seção 10.3 e 10.4).
//
// O agente não inventa texto: ele recupera itens da base validada pela ONG e
// devolve o conteúdo deles, citando a fonte. Este arquivo contém a parte que
// decide O QUE responder; o serviço decide o que fazer com essa decisão.

const acentos = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const normalizar = (s) => acentos(s).replace(/[^a-z0-9\s]/g, ' ');

// Palavras que aparecem em quase toda frase e não ajudam a distinguir item.
const VAZIAS = new Set((
  'a as o os um uma uns umas de do da dos das em no na nos nas por para com que ' +
  'qual quais e ou se eu meu minha meus minhas ele ela eles elas isso esse essa ' +
  'este esta isto aquele como quando onde quanto quantos quanta muito muita mais ' +
  'menos ja ser sao estao estou esta tem ter tenho tendo fazer faz dar dou vai vao ' +
  'fica ficar deve devo pode posso preciso quero queria gostaria saber dizer sobre ' +
  'ao aos pelo pela nao sim bem mesmo cada qualquer entre depois antes ainda aqui ' +
  'ali dia dias vez vezes coisa ' +
  // Verbos de uso geral: aparecem em qualquer pergunta e não dizem do que ela
  // trata. Sem eles aqui, "preciso saber o que meu cão precisa tomar" divide a
  // confiança por seis em vez de por dois, e a resposta certa fica abaixo do
  // limiar — foi exatamente o que aconteceu no primeiro teste.
  'precisa precisam precisava tomar toma tomam todo toda todos todas levar leva ' +
  'usar usa pegar colocar deixar comprar ajudar funciona serve costuma'
).split(' '));

// Guardrail de entrada (RNF14): o agente responde sobre animais e adoção.
// Fora disso ele não tenta — oferece a equipe da ONG.
const ESCOPO = (
  'animal animais cao caes cachorro cachorra gato gata gatos felino filhote pet ' +
  'bicho adocao adotar adotante ong abrigo vacina vacinas vacinacao vermifugo ' +
  'pulga carrapato racao comida alimentacao saude doente sintoma veterinario ' +
  'castracao passeio adestramento comportamento late mia cuidado cuidados tutor ' +
  'lar olho olhos orelha dente dentes pata patas pele unha ferida febre vomito ' +
  'diarreia coceira peso magro gordo castrado idoso'
).split(' ');

// Sinais que pedem veterinário antes de qualquer orientação (RNF12).
// Lista de expressões, não de palavras soltas: quebrar "não come" em duas
// fazia "nao" disparar em qualquer frase negativa e "come" disparar dentro de
// "comer", e aí toda pergunta sobre ração virava emergência.
const URGENCIA = [
  'sangue', 'sangrando', 'convulsa', 'vomitando', 'vomito', 'diarreia',
  'nao come', 'nao esta comendo', 'nao quer comer', 'parou de comer',
  'apatic', 'dificuldade para respirar', 'ofegante', 'atropelad', 'machucad',
  'ferida', 'inchad', 'gemendo', 'tremendo', 'desmaio', 'envenenad', 'veneno',
  'engasgad', 'nao levanta', 'nao anda',
];

function termos(texto) {
  return normalizar(texto).split(/\s+/).filter((w) => w.length > 2 && !VAZIAS.has(w));
}

function dentroDoEscopo(pergunta) {
  const ts = termos(pergunta);
  return ts.some((w) => ESCOPO.some((e) => e.startsWith(w.slice(0, 5)) || w.startsWith(e.slice(0, 5))));
}

function temUrgencia(pergunta) {
  const n = normalizar(pergunta);
  return URGENCIA.some((u) => n.includes(u));
}

// Casamento tolerante a flexão. Prefixo em comum em vez de "uma começa com a
// outra", senão "apático" não encontra "apatia" — elas divergem na quinta
// letra, e era por isso que o agente calava diante de um sinal de alerta.
// Cinco letras em comum é o ponto em que o parentesco deixa de ser acaso:
// "vacina/vacinação" e "cachorro/cachorra" entram, "come/comprar" não.
const PREFIXO = 5;

function parentes(a, b) {
  if (a.length < PREFIXO || b.length < PREFIXO) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i >= PREFIXO;
}

function casa(palavra, conjunto) {
  if (conjunto.has(palavra)) return true;
  for (const t of conjunto) {
    if (parentes(palavra, t)) return true;
  }
  return false;
}

const indice = (item) => ({
  chave: new Set(termos(`${item.titulo} ${item.termos || ''}`)),
  corpo: new Set(termos(item.conteudo)),
});

// Peso de cada palavra da pergunta, pela raridade na base.
//
// Sem isso, "meu gato pode comer chocolate" pontua alto: "gato" e "comer"
// aparecem em quase todo item e carregam a conta sozinhos, enquanto
// "chocolate" — a palavra que define a pergunta — não aparece em lugar nenhum
// e some. O agente então responde com o item de alimentação, que não fala de
// chocolate. Palavra que aparece em muitos itens pesa pouco; palavra que não
// aparece em nenhum pesa muito, e deixar ela sem cobertura derruba a confiança.
function pesos(ts, universo) {
  const total = universo.length || 1;
  const indices = universo.map(indice);
  const p = new Map();
  ts.forEach((w) => {
    const emQuantos = indices.filter((ix) => casa(w, ix.chave) || casa(w, ix.corpo)).length;
    p.set(w, Math.log(1 + total / (1 + emQuantos)));
  });
  return p;
}

// Confiança = fração do peso da pergunta que o item cobre. Acerto no título ou
// nos termos de busca vale cheio; no corpo vale menos, porque a palavra pode
// estar lá de passagem.
function pontuar(pergunta, itens, universo) {
  const ts = termos(pergunta);
  if (!ts.length) return [];

  const p = pesos(ts, universo && universo.length ? universo : itens);
  const pesoTotal = ts.reduce((s, w) => s + p.get(w), 0) || 1;

  return itens
    .map((item) => {
      const ix = indice(item);
      let pontos = 0;
      ts.forEach((w) => {
        if (casa(w, ix.chave)) pontos += p.get(w);
        else if (casa(w, ix.corpo)) pontos += p.get(w) * 0.45;
      });
      return { item, confianca: Number((pontos / pesoTotal).toFixed(2)) };
    })
    .filter((r) => r.confianca > 0)
    .sort((a, b) => b.confianca - a.confianca);
}

// Abaixo disso o agente prefere não responder e encaminha para a ONG.
// O valor saiu da calibragem feita no protótipo, com as perguntas de exemplo.
const LIMIAR = 0.34;

module.exports = { termos, dentroDoEscopo, temUrgencia, pontuar, LIMIAR };
