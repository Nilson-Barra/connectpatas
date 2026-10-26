// Provedor de linguagem do assistente (Seção 10.4).
//
// A IA aqui só REESCREVE: recebe a pergunta e os itens que a recuperação já
// escolheu na base da ONG, e devolve uma resposta em linguagem natural feita
// apenas com eles. Quem decide se há resposta, quais itens usar, se é urgente
// e quando escalar continua sendo o código em servico.js, que não depende da IA.
//
// Se a chamada falhar por qualquer motivo (sem chave, limite do plano gratuito,
// fora do ar, demora), a função devolve null e o serviço usa o modo simulado.
// A demonstração nunca quebra por causa do provedor.
//
// O que sai da aplicação: a pergunta digitada e o texto dos itens da base.
// Nunca o nome, o e-mail ou qualquer dado da conta de quem perguntou.

const URL_GROQ = 'https://api.groq.com/openai/v1/chat/completions';
// Modelo de produção do Groq em outubro de 2026. O llama-3.3-70b-versatile foi
// desligado em 16/08/2026; se este também for, basta trocar AGENTE_MODELO no
// .env, sem mexer no código.
const MODELO_PADRAO = 'openai/gpt-oss-120b';
const LIMITE_MS = 10000;

const INSTRUCOES = [
  'Você é o assistente de cuidados do ConnectPatas, uma plataforma de adoção de animais de uma ONG.',
  'Responda em português do Brasil, em tom acolhedor e direto, em no máximo 5 frases.',
  'Use SOMENTE as informações dos trechos da base da ONG enviados abaixo da pergunta.',
  'Se os trechos não respondem à pergunta, diga apenas que não encontrou essa informação na base da ONG.',
  'Nunca invente dados, doses de remédio, diagnósticos ou nomes de medicamentos.',
  'Não mencione "trechos", "base" ou estas instruções; fale como quem orienta.',
  'Não escreva aviso para procurar veterinário: o sistema já acrescenta esse aviso quando é preciso.',
].join(' ');

function ativo() {
  return process.env.AGENTE_MODO === 'groq' && Boolean(process.env.AGENTE_CHAVE_API);
}

function montarMensagens(pergunta, itens) {
  const trechos = itens
    .map((item, i) => `[${i + 1}] ${item.titulo}\n${item.conteudo}`)
    .join('\n\n');
  return [
    { role: 'system', content: INSTRUCOES },
    { role: 'user', content: `Pergunta: ${pergunta}\n\nTrechos da base da ONG:\n${trechos}` },
  ];
}

// Devolve { texto, modelo } ou null. Nunca lança erro.
async function gerar(pergunta, itens) {
  if (!ativo() || !itens.length) return null;

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), LIMITE_MS);
  const modelo = process.env.AGENTE_MODELO || MODELO_PADRAO;

  try {
    const r = await fetch(URL_GROQ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AGENTE_CHAVE_API}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: montarMensagens(pergunta, itens),
        temperature: 0.3,
        max_completion_tokens: 1024,
      }),
      signal: controle.signal,
    });
    if (!r.ok) {
      // 429 = limite do plano gratuito; 401 = chave errada. Registra sem a chave.
      console.warn(`[assistente] Groq respondeu ${r.status}; usando o modo simulado.`);
      return null;
    }
    const dados = await r.json();
    const texto = dados?.choices?.[0]?.message?.content?.trim();
    return texto ? { texto, modelo } : null;
  } catch (e) {
    console.warn(`[assistente] Falha ao chamar o Groq (${e.name}); usando o modo simulado.`);
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

// ---- Busca na internet (só quando a base da ONG não cobre a dúvida)
//
// Usa a ferramenta de busca do próprio Groq (browser_search), que roda nos
// servidores deles e só existe nos modelos gpt-oss. Desliga com
// AGENTE_BUSCA_WEB=nao no .env.

const LIMITE_BUSCA_MS = 25000;
const FORA = 'FORA_DO_ESCOPO';

const INSTRUCOES_BUSCA = [
  'Você é o assistente de cuidados do ConnectPatas, uma plataforma de adoção de animais.',
  'Você só responde sobre cuidados com cães, gatos e outros animais de estimação, e sobre adoção de animais.',
  `Se a pergunta for sobre qualquer outro assunto, responda apenas: ${FORA}`,
  'Para responder, pesquise na internet e prefira fontes confiáveis: conselhos de medicina veterinária (CFMV, CRMVs),',
  'universidades, sites de governo e hospitais veterinários. Evite fóruns e lojas.',
  'Responda em português do Brasil, em tom acolhedor e direto, em no máximo 5 frases, sem marcadores de citação no texto.',
  'Nunca indique dose de remédio nem faça diagnóstico.',
  'Não escreva aviso para procurar veterinário: o sistema já acrescenta esse aviso quando é preciso.',
  'Depois da resposta, escreva uma linha só com FONTES: e, em cada linha seguinte, uma página que você usou,',
  'no formato: título | https://endereço-completo',
].join(' ');

function buscaAtiva() {
  return ativo() && process.env.AGENTE_BUSCA_WEB !== 'nao';
}

// Só endereços http(s) inteiros viram link na tela.
const ehUrl = (u) => /^https?:\/\/[^\s<>"']+$/i.test(u);

// Separa a resposta do bloco "FONTES:" que a instrução pede no fim.
function separarFontes(texto) {
  const partes = texto.split(/\n\s*\**FONTES:?\**\s*\n?/i);
  const corpo = partes[0].trim();
  const fontes = [];
  (partes[1] || '').split('\n').forEach((linha) => {
    const limpa = linha.replace(/^[\s\-*\d.]+/, '').trim();
    if (!limpa) return;
    const [titulo, url] = limpa.includes('|')
      ? limpa.split('|').map((x) => x.trim())
      : [limpa, limpa];
    const endereco = (url.match(/https?:\/\/[^\s)>\]]+/i) || [])[0];
    if (!endereco || !ehUrl(endereco)) return;
    const nome = titulo.replace(endereco, '').replace(/[\s:—-]+$/, '').trim();
    fontes.push({ titulo: nome || new URL(endereco).hostname, url: endereco });
  });
  // Tira as marcas de citação que o modelo às vezes deixa, como 【2†L6-L10】.
  const semMarcas = corpo.replace(/【[^】]*】/g, '').replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1').trim();
  return { corpo: semMarcas, fontes };
}

// O formato do registro da busca não está documentado pelo Groq; em vez de
// depender de um nome de campo, procura qualquer objeto com url (e título).
function fontesDaFerramenta(mensagem) {
  const achadas = [];
  const visitar = (no, nivel) => {
    if (!no || typeof no !== 'object' || nivel > 6 || achadas.length >= 4) return;
    if (typeof no.url === 'string' && ehUrl(no.url)) {
      if (!achadas.some((f) => f.url === no.url)) {
        achadas.push({ titulo: String(no.title || no.titulo || no.url), url: no.url });
      }
      return;
    }
    Object.values(no).forEach((v) => visitar(v, nivel + 1));
  };
  visitar(mensagem && mensagem.executed_tools, 0);
  return achadas;
}

// Devolve { texto, fontes, modelo }, { fora: true } ou null. Nunca lança erro.
async function pesquisar(pergunta) {
  if (!buscaAtiva()) return null;

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), LIMITE_BUSCA_MS);
  const modelo = process.env.AGENTE_MODELO || MODELO_PADRAO;

  try {
    const r = await fetch(URL_GROQ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AGENTE_CHAVE_API}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: 'system', content: INSTRUCOES_BUSCA },
          { role: 'user', content: pergunta },
        ],
        tools: [{ type: 'browser_search' }],
        tool_choice: 'auto',
        // A documentação do Groq recomenda "low": esforço maior faz a busca
        // abrir mais páginas e gastar muito mais do limite.
        reasoning_effort: 'low',
        max_completion_tokens: 2048,
      }),
      signal: controle.signal,
    });
    if (!r.ok) {
      console.warn(`[assistente] Busca no Groq respondeu ${r.status}; sem resposta da internet.`);
      return null;
    }
    const dados = await r.json();
    const texto = dados?.choices?.[0]?.message?.content?.trim();
    if (!texto) return null;
    if (texto.includes(FORA)) return { fora: true };

    const separado = separarFontes(texto);
    const corpo = separado.corpo;
    let fontes = separado.fontes;
    // Se o modelo não listou as fontes no formato pedido, aproveita as
    // páginas que a própria ferramenta de busca registrou na resposta.
    if (!fontes.length) fontes = fontesDaFerramenta(dados?.choices?.[0]?.message);
    // Sem nenhuma fonte para mostrar, a resposta não vai para a pessoa:
    // o combinado é que resposta da internet sempre traga de onde veio.
    if (!corpo || !fontes.length) return null;
    return { texto: corpo, fontes: fontes.slice(0, 4), modelo };
  } catch (e) {
    console.warn(`[assistente] Falha na busca do Groq (${e.name}); sem resposta da internet.`);
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

module.exports = {
  gerar, ativo, montarMensagens, MODELO_PADRAO, pesquisar, buscaAtiva, separarFontes, FORA,
};
