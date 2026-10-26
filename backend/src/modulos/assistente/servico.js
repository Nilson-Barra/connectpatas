const repositorio = require('./repositorio');
const provedor = require('./provedor');
const { dentroDoEscopo, temUrgencia, termos, pontuar, LIMIAR } = require('./recuperador');
const { erro } = require('../../comum/erros');

// Modo de operação do agente (Seção 10.4).
// "simulado": responde só com o texto dos itens recuperados, sem chamar nada
// de fora. "groq": os mesmos itens vão para um modelo de linguagem, que só
// reescreve a resposta em linguagem natural (provedor.js). Nos dois modos a
// recuperação, os guardrails, o aviso de urgência e as fontes são os mesmos.
const MODO = process.env.AGENTE_MODO || 'simulado';

const AVISO_VETERINARIO =
  'Pelo que você descreveu, o caminho é procurar um veterinário o quanto antes, ' +
  'porque eu não consigo avaliar o que o animal tem.';

const SEM_RESPOSTA =
  'Não encontrei na base da ONG informação suficiente para responder isso com ' +
  'segurança, então prefiro não arriscar. Posso encaminhar sua dúvida para a equipe.';

const FORA_DE_ESCOPO =
  'Eu respondo só a dúvidas sobre cuidados com animais e sobre o processo de ' +
  'adoção, então essa não está no meu alcance. Quer que eu encaminhe sua ' +
  'mensagem para a equipe da ONG?';

const CURTA =
  'Me conta um pouco mais? Com uma pergunta mais específica eu consigo achar o ' +
  'item certo na base da ONG — por exemplo, o que você quer saber sobre ' +
  'vacinação, alimentação, comportamento ou saúde.';

// Compõe a resposta a partir dos itens recuperados. No modo simulado isso é
// concatenar o conteúdo validado; nenhum texto é gerado do nada.
function compor(usados, urgente) {
  const corpo = usados.map((r) => r.item.conteudo).join(' ');
  return urgente ? `${AVISO_VETERINARIO} ${corpo}` : corpo;
}

const servico = {
  // ---- UC11: perguntar ao assistente
  async responder(idOng, pergunta, { idUsuario = null, idConversa = null } = {}) {
    const texto = String(pergunta || '').trim();
    if (!texto) throw erro.requisicao('Escreva sua dúvida.');
    if (texto.length > 500) throw erro.requisicao('Pergunta longa demais. Resuma em poucas linhas.');

    const conversa = idConversa
      ? await repositorio.conversaPorId(idConversa)
      : await repositorio.criarConversa({ idOng, idUsuario, iniciadaEm: new Date() });
    if (!conversa) throw erro.naoEncontrado('Conversa não encontrada.');

    await repositorio.criarMensagem({
      idConversa: conversa.id, origem: 'usuario', conteudo: texto, enviadaEm: new Date(),
    });

    const resposta = await servico.decidir(idOng, texto);

    await repositorio.criarMensagem({
      idConversa: conversa.id,
      origem: 'agente',
      conteudo: resposta.conteudo,
      fontes: resposta.fontes.length ? JSON.stringify(resposta.fontes) : null,
      confianca: resposta.confianca,
      enviadaEm: new Date(),
    });

    return {
      idConversa: conversa.id,
      ...resposta,
      // O front usa isto para oferecer o botão de encaminhar (UC12).
      ofereceEscalar: resposta.tipo !== 'ok',
    };
  },

  // A decisão em si, separada do registro: dá para testar sem tocar no banco
  // de conversas e é onde entraria o provedor externo, se houver.
  async decidir(idOng, pergunta) {
    const vazio = { fontes: [], confianca: null };
    const urgente = temUrgencia(pergunta);

    // Sinal de urgência manda procurar veterinário mesmo quando o agente não
    // sabe o resto. Calar diante de "está vomitando sangue" porque a base não
    // cobre o caso seria o pior desfecho possível.
    const semSaber = (conteudo) => ({
      conteudo: urgente ? `${AVISO_VETERINARIO} ${conteudo}` : conteudo,
      ...vazio,
    });

    if (termos(pergunta).length < 2) {
      return { tipo: 'curta', ...semSaber(CURTA) };
    }
    // Guardrail de entrada antes de qualquer busca: o que está fora do
    // assunto nem chega a consultar a base.
    if (!dentroDoEscopo(pergunta)) {
      return { tipo: 'fora', conteudo: FORA_DE_ESCOPO, ...vazio };
    }

    // A busca do banco traz os candidatos pelo índice GIN (Seção 7.4); a base
    // ativa inteira serve de universo para medir a raridade de cada palavra.
    const [candidatos, universo] = await Promise.all([
      repositorio.buscar(idOng, termos(pergunta)),
      repositorio.listarItens(idOng, { ativo: true }),
    ]);
    const achados = pontuar(pergunta, candidatos, universo);
    const melhor = achados[0];

    // Guardrail de saída: sem base suficiente, o agente não inventa. Com o Groq
    // ligado, tenta a internet antes de desistir; sem resposta de lá, cala e
    // oferece encaminhar para a ONG, como antes.
    if (!melhor || melhor.confianca < LIMIAR) {
      const web = await provedor.pesquisar(pergunta);
      if (web && web.fora) {
        return { tipo: 'fora', conteudo: FORA_DE_ESCOPO, ...vazio };
      }
      if (web) {
        return {
          // "web" não é "ok": a resposta não foi validada pela ONG, então o
          // botão de encaminhar para a equipe continua aparecendo.
          tipo: 'web',
          conteudo: urgente ? `${AVISO_VETERINARIO} ${web.texto}` : web.texto,
          fontes: web.fontes.map((f) => ({
            titulo: f.titulo, url: f.url, fonte: 'Internet', validadoPor: null,
          })),
          confianca: null,
          modo: 'groq-web',
        };
      }
      return { tipo: 'baixa', ...semSaber(SEM_RESPOSTA) };
    }

    // Usa só os itens próximos do melhor: juntar item fraco dilui a resposta.
    const usados = achados.filter((r) => r.confianca >= melhor.confianca * 0.75).slice(0, 2);

    // Com o Groq ligado, a IA escreve a resposta a partir dos mesmos itens. O
    // aviso de urgência é acrescentado aqui, pelo código, e não pedido à IA:
    // ele não pode depender de o modelo lembrar de escrevê-lo.
    const gerada = await provedor.gerar(pergunta, usados.map((r) => r.item));
    const conteudo = gerada
      ? (urgente ? `${AVISO_VETERINARIO} ${gerada.texto}` : gerada.texto)
      : compor(usados, urgente);

    return {
      tipo: 'ok',
      conteudo,
      // RNF12 e RNF15: toda resposta carrega de onde veio e quem validou.
      fontes: usados.map((r) => ({
        id: r.item.id,
        titulo: r.item.titulo,
        fonte: r.item.fonte,
        validadoPor: r.item.validadoPor,
      })),
      confianca: melhor.confianca,
      // Qual caminho respondeu de fato: se o Groq falhou, aparece "simulado".
      modo: gerada ? 'groq' : 'simulado',
    };
  },

  // ---- UC12: encaminhar para a ONG
  async escalar(idConversa, idOng) {
    const conversa = await repositorio.conversaPorId(idConversa);
    if (!conversa) throw erro.naoEncontrado('Conversa não encontrada.');
    if (conversa.escaladaParaOng) {
      throw erro.conflito('Esta dúvida já foi encaminhada para a equipe.');
    }
    await repositorio.atualizarConversa(conversa, {
      escaladaParaOng: true,
      idOng: conversa.idOng || idOng,
    });
    return repositorio.conversaPorId(idConversa);
  },

  mensagens: (idConversa) => repositorio.mensagensDaConversa(idConversa),

  listarEscaladas: (idOng) => repositorio.escaladasDaOng(idOng),

  // A ONG responde a dúvida escalada dentro da mesma conversa.
  async responderEscalada(idConversa, idOng, conteudo) {
    const texto = String(conteudo || '').trim();
    if (!texto) throw erro.requisicao('A resposta não pode ser vazia.');

    const conversa = await repositorio.conversaPorId(idConversa);
    if (!conversa) throw erro.naoEncontrado('Conversa não encontrada.');
    if (conversa.idOng !== idOng) throw erro.semPermissao('Esta conversa é de outra ONG.');

    await repositorio.criarMensagem({
      idConversa, origem: 'ong', conteudo: texto, enviadaEm: new Date(),
    });
    return repositorio.mensagensDaConversa(idConversa);
  },

  // ---- UC13: manter a base de conhecimento
  listarItens: (idOng, filtros) => repositorio.listarItens(idOng, filtros),

  criarItem(idOng, corpo) {
    const dados = Object.fromEntries(
      Object.entries(corpo || {}).filter(([k]) => repositorio.CAMPOS.includes(k))
    );
    return repositorio.criarItem({
      ...dados,
      idOng,
      validadoEm: dados.validadoEm || new Date(),
    });
  },

  async atualizarItem(id, idOng, corpo) {
    const item = await repositorio.itemPorId(id);
    if (!item) throw erro.naoEncontrado('Item não encontrado.');
    if (item.idOng !== idOng) throw erro.semPermissao('Este item é de outra ONG.');
    const dados = Object.fromEntries(
      Object.entries(corpo || {}).filter(([k]) => repositorio.CAMPOS.includes(k))
    );
    return repositorio.atualizarItem(item, dados);
  },

  MODO,
};

module.exports = servico;
