const request = require('supertest');
process.env.NODE_ENV = 'test';
const { criarApp } = require('../src/app');
const { sequelize } = require('../src/models');

const app = criarApp();
const SENHA = 'connectpatas';

const entrar = async (email) => {
  const agente = request.agent(app);
  const r = await agente.post('/api/auth/login').send({ email, senha: SENHA });
  expect(r.status).toBe(200);
  return agente;
};

afterAll(async () => { await sequelize.close(); });

describe('autenticação (RNF03)', () => {
  it('entra com as credenciais corretas e devolve o perfil', async () => {
    const r = await request(app).post('/api/auth/login')
      .send({ email: 'leticia@amigosdepatas.org', senha: SENHA });
    expect(r.status).toBe(200);
    expect(r.body.usuario.tipoUsuario).toBe('responsavel_ong');
    expect(r.body.usuario.idOng).toBeTruthy();
    // o cookie de sessão não pode ser legível por JavaScript
    expect(r.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  it('recusa senha errada sem dizer se o e-mail existe', async () => {
    const r = await request(app).post('/api/auth/login')
      .send({ email: 'leticia@amigosdepatas.org', senha: 'errada' });
    expect(r.status).toBe(400);
    expect(r.body.erro).toBe('E-mail ou senha incorretos.');
  });

  it('dá a mesma resposta para e-mail inexistente', async () => {
    const r = await request(app).post('/api/auth/login')
      .send({ email: 'ninguem@exemplo.com', senha: SENHA });
    expect(r.body.erro).toBe('E-mail ou senha incorretos.');
  });

  it('bloqueia rota privada sem sessão', async () => {
    expect((await request(app).get('/api/auth/eu')).status).toBe(401);
  });

  it('o logout invalida a sessão', async () => {
    const agente = await entrar('leticia@amigosdepatas.org');
    expect((await agente.get('/api/auth/eu')).status).toBe(200);
    await agente.post('/api/auth/logout');
    expect((await agente.get('/api/auth/eu')).status).toBe(401);
  });

  it('nunca devolve o hash da senha', async () => {
    const agente = await entrar('leticia@amigosdepatas.org');
    const r = await agente.get('/api/auth/eu');
    expect(JSON.stringify(r.body)).not.toMatch(/senhaHash|senha_hash|\$2[aby]\$/);
  });
});

describe('criar conta pela tela (adotante)', () => {
  const { zerarCadastros } = require('../src/middlewares/protecao');
  beforeEach(() => zerarCadastros());
  const nova = (extra = {}) => ({
    nome: 'Joana Teste', email: `joana.${Date.now()}.${Math.random()}@exemplo.com`,
    senha: 'patinhas123', telefone: '(19) 98765-4321', ...extra,
  });

  it('cria a conta de adotante e já deixa logado', async () => {
    const agente = request.agent(app);
    const r = await agente.post('/api/auth/cadastro').send(nova());
    expect(r.status).toBe(201);
    expect(r.body.usuario.tipoUsuario).toBe('adotante');
    expect(r.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    const eu = await agente.get('/api/auth/eu');
    expect(eu.status).toBe(200);
    expect(eu.body.usuario.senhaHash).toBeUndefined();
    // e consegue usar a área do adotante
    expect((await agente.get('/api/minhas-solicitacoes')).status).toBe(200);
  });

  it('ignora quem tenta se cadastrar como equipe da ONG (RNF03)', async () => {
    const agente = request.agent(app);
    const r = await agente.post('/api/auth/cadastro')
      .send(nova({ tipoUsuario: 'responsavel_ong', idOng: 1 }));
    expect(r.body.usuario.tipoUsuario).toBe('adotante');
    expect(r.body.usuario.idOng).toBeNull();
    expect((await agente.get('/api/painel')).status).toBe(403);
  });

  it('a conta criada entra pelo login normal', async () => {
    const dados = nova();
    await request(app).post('/api/auth/cadastro').send(dados);
    const r = await request(app).post('/api/auth/login')
      .send({ email: dados.email.toUpperCase(), senha: dados.senha });
    expect(r.status).toBe(200);
  });

  it('recusa e-mail que já tem conta', async () => {
    const r = await request(app).post('/api/auth/cadastro')
      .send(nova({ email: 'maria@exemplo.com' }));
    expect(r.status).toBe(409);
  });

  it.each([
    [{ senha: 'curta1' }, 'senha'],
    [{ senha: 'somenteletras' }, 'senha'],
    [{ email: 'sem-arroba' }, 'email'],
    [{ nome: ' ' }, 'nome'],
    [{ telefone: '<script>' }, 'telefone'],
  ])('recusa dado inválido %j', async (extra, campo) => {
    const r = await request(app).post('/api/auth/cadastro').send(nova(extra));
    expect(r.status).toBe(400);
    expect(r.body.detalhes[0].campo).toBe(campo);
  });

  it('freia a criação em massa de contas a partir do mesmo endereço', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).post('/api/auth/cadastro').send(nova())).status).toBe(201);
    }
    const r = await request(app).post('/api/auth/cadastro').send(nova());
    expect(r.status).toBe(429);
    expect(r.headers['retry-after']).toBeTruthy();
  });
});

describe('consulta pública de animais (UC04)', () => {
  it('lista somente animais disponíveis', async () => {
    const r = await request(app).get('/api/publico/animais?porPagina=50');
    expect(r.status).toBe(200);
    expect(r.body.animais.length).toBeGreaterThan(0);
    r.body.animais.forEach((a) => expect(a.status).toBe('Disponível'));
  });

  it('filtra por espécie', async () => {
    const r = await request(app).get('/api/publico/animais?especie=Felina');
    r.body.animais.forEach((a) => expect(a.especie).toBe('Felina'));
  });

  it('não expõe animal fora de disponível', async () => {
    const todos = await request(app).get('/api/publico/animais?porPagina=50');
    const disponiveis = todos.body.animais.map((a) => a.id);
    const agente = await entrar('leticia@amigosdepatas.org');
    const daOng = await agente.get('/api/animais');
    const adotado = daOng.body.animais.find((a) => a.status === 'Adotado');
    expect(adotado).toBeTruthy();
    expect(disponiveis).not.toContain(adotado.id);
    expect((await request(app).get(`/api/publico/animais/${adotado.id}`)).status).toBe(404);
  });
});

describe('catálogo em páginas', () => {
  it('entrega 12 por vez e a página seguinte traz outros animais', async () => {
    const p1 = await request(app).get('/api/publico/animais');
    const p2 = await request(app).get('/api/publico/animais?pagina=2');
    expect(p1.body.animais).toHaveLength(12);
    expect(p1.body.total).toBeGreaterThan(12);
    const ids = new Set(p1.body.animais.map((a) => a.id));
    expect(p2.body.animais.length).toBeGreaterThan(0);
    expect(p2.body.animais.some((a) => ids.has(a.id))).toBe(false);
  });
});

describe('autorização por perfil (RNF03)', () => {
  it('voluntário cadastra animal', async () => {
    const agente = await entrar('luri@amigosdepatas.org');
    const r = await agente.post('/api/animais')
      .send({ nome: 'Tobias', especie: 'Canina', idade: '1 ano', porte: 'Pequeno' });
    expect(r.status).toBe(201);
    expect(r.body.animal.status).toBe('Disponível');
  });

  it('voluntário não acessa o painel, que é do responsável (UC09)', async () => {
    const agente = await entrar('luri@amigosdepatas.org');
    expect((await agente.get('/api/painel')).status).toBe(403);
  });

  it('responsável acessa o painel', async () => {
    const agente = await entrar('leticia@amigosdepatas.org');
    const r = await agente.get('/api/painel');
    expect(r.status).toBe(200);
    expect(r.body.animais.total).toBeGreaterThan(0);
  });

  it('adotante não acessa a área da ONG', async () => {
    const agente = await entrar('maria@exemplo.com');
    expect((await agente.get('/api/animais')).status).toBe(403);
  });
});

describe('regras de cadastro de animal', () => {
  it('recusa animal sem nome', async () => {
    const agente = await entrar('luri@amigosdepatas.org');
    const r = await agente.post('/api/animais').send({ especie: 'Canina' });
    expect(r.status).toBe(400);
  });

  it('não deixa editar à mão o status de animal em processo de adoção', async () => {
    const agente = await entrar('leticia@amigosdepatas.org');
    const lista = await agente.get('/api/animais');
    const emProcesso = lista.body.animais.find((a) => a.status === 'Em processo de adoção');
    const r = await agente.put(`/api/animais/${emProcesso.id}`).send({ status: 'Disponível' });
    expect(r.status).toBe(409);
  });

  it('permite editar os demais campos', async () => {
    const agente = await entrar('leticia@amigosdepatas.org');
    const lista = await agente.get('/api/animais');
    const alvo = lista.body.animais.find((a) => a.status === 'Disponível');
    const r = await agente.put(`/api/animais/${alvo.id}`).send({ idade: '4 anos' });
    expect(r.status).toBe(200);
    expect(r.body.animal.idade).toBe('4 anos');
  });
});

describe('processo de adoção (UC05, UC06, UC07)', () => {
  // Procura pelo nome em vez de fixar o id: a seed pode mudar de ordem.
  const acharPublico = async (nome) => {
    const r = await request(app).get('/api/publico/animais?porPagina=50');
    const a = r.body.animais.find((x) => x.nome === nome);
    expect(a).toBeTruthy();
    return a;
  };

  it('adotante abre solicitação e o animal sai do catálogo público (UC05)', async () => {
    const rex = await acharPublico('Rex');
    const maria = await entrar('maria@exemplo.com');

    const r = await maria.post(`/api/animais/${rex.id}/solicitacoes`)
      .send({ telefoneContato: '19999990000', moradia: 'Casa com quintal' });
    expect(r.status).toBe(201);
    expect(r.body.solicitacao.status).toBe('Pendente');
    expect(r.body.solicitacao.etapa).toBe(1);

    // o animal passou a "Em processo" e por isso sumiu da vitrine
    const publico = await request(app).get('/api/publico/animais?porPagina=50');
    expect(publico.body.animais.find((x) => x.id === rex.id)).toBeFalsy();
    const ficha = await request(app).get(`/api/publico/animais/${rex.id}`);
    expect(ficha.status).toBe(404);
  });

  it('não deixa o mesmo adotante pedir duas vezes o mesmo animal', async () => {
    const maria = await entrar('maria@exemplo.com');
    const minhas = await maria.get('/api/minhas-solicitacoes');
    const idAnimal = minhas.body.solicitacoes[0].animal.id;

    const r = await maria.post(`/api/animais/${idAnimal}/solicitacoes`).send({});
    expect(r.status).toBe(409);
  });

  it('não deixa solicitar animal que já está em processo', async () => {
    const joao = await entrar('joao@exemplo.com');
    const minhas = await joao.get('/api/minhas-solicitacoes');
    const idAnimal = minhas.body.solicitacoes[0].animal.id; // Mel, em processo

    const ana = await entrar('ana@exemplo.com');
    const r = await ana.post(`/api/animais/${idAnimal}/solicitacoes`).send({});
    expect(r.status).toBe(409);
  });

  it('equipe da ONG não abre solicitação (RNF03)', async () => {
    const luna = await acharPublico('Luna');
    const leticia = await entrar('leticia@amigosdepatas.org');
    const r = await leticia.post(`/api/animais/${luna.id}/solicitacoes`).send({});
    expect(r.status).toBe(403);
  });

  it('recusa pular etapas do processo (Figura 8)', async () => {
    const leticia = await entrar('leticia@amigosdepatas.org');
    const fila = await leticia.get('/api/solicitacoes?status=Pendente');
    const pendente = fila.body.solicitacoes[0];
    expect(pendente).toBeTruthy();

    const r = await leticia.put(`/api/solicitacoes/${pendente.id}/status`)
      .send({ status: 'Concluída' });
    expect(r.status).toBe(400);
  });

  it('adotante não move o status da própria solicitação (RNF03)', async () => {
    const maria = await entrar('maria@exemplo.com');
    const minhas = await maria.get('/api/minhas-solicitacoes');
    const r = await maria.put(`/api/solicitacoes/${minhas.body.solicitacoes[0].id}/status`)
      .send({ status: 'Em análise' });
    expect(r.status).toBe(403);
  });

  it('percorre o processo até a adoção e marca o animal como adotado (UC06, UC07)', async () => {
    const leticia = await entrar('leticia@amigosdepatas.org');
    const maria = await entrar('maria@exemplo.com');
    const minhas = await maria.get('/api/minhas-solicitacoes');
    const id = minhas.body.solicitacoes[0].id;
    const idAnimal = minhas.body.solicitacoes[0].animal.id;

    for (const [status, etapa] of [['Em análise', 2], ['Aprovada', 3], ['Concluída', 4]]) {
      const r = await leticia.put(`/api/solicitacoes/${id}/status`).send({ status });
      expect(r.status).toBe(200);
      expect(r.body.solicitacao.status).toBe(status);
      expect(r.body.solicitacao.etapa).toBe(etapa);
    }

    const animal = await leticia.get(`/api/animais/${idAnimal}`);
    expect(animal.body.animal.status).toBe('Adotado');

    // processo encerrado não anda mais
    const depois = await leticia.put(`/api/solicitacoes/${id}/status`)
      .send({ status: 'Em análise' });
    expect(depois.status).toBe(409);
  });

  it('recusar devolve o animal para o catálogo público', async () => {
    const luna = await acharPublico('Luna');
    const ana = await entrar('ana@exemplo.com');
    const criada = await ana.post(`/api/animais/${luna.id}/solicitacoes`).send({});
    expect(criada.status).toBe(201);

    const leticia = await entrar('leticia@amigosdepatas.org');
    const r = await leticia.put(`/api/solicitacoes/${criada.body.solicitacao.id}/status`)
      .send({ status: 'Recusada', observacoes: 'Perfil não compatível.' });
    expect(r.status).toBe(200);

    const publico = await request(app).get('/api/publico/animais?porPagina=50');
    expect(publico.body.animais.find((x) => x.id === luna.id)).toBeTruthy();
  });

  it('não deixa um adotante ver a solicitação de outro', async () => {
    const maria = await entrar('maria@exemplo.com');
    const minhas = await maria.get('/api/minhas-solicitacoes');
    const joao = await entrar('joao@exemplo.com');
    const r = await joao.get(`/api/solicitacoes/${minhas.body.solicitacoes[0].id}`);
    expect(r.status).toBe(403);
  });

  it('o painel traz o resumo das solicitações (UC09)', async () => {
    const leticia = await entrar('leticia@amigosdepatas.org');
    const r = await leticia.get('/api/painel');
    expect(r.status).toBe(200);
    expect(r.body.solicitacoes).toHaveProperty('abertas');
    expect(r.body.solicitacoes['Concluída']).toBeGreaterThanOrEqual(1);
  });
});

describe('mensagens da solicitação (UC08)', () => {
  it('os dois lados conversam dentro da solicitação', async () => {
    const joao = await entrar('joao@exemplo.com');
    const minhas = await joao.get('/api/minhas-solicitacoes');
    const id = minhas.body.solicitacoes[0].id; // Mel, aprovada

    const envio = await joao.post(`/api/solicitacoes/${id}/mensagens`)
      .send({ conteudo: 'Posso buscar a Mel no sábado?' });
    expect(envio.status).toBe(201);

    const leticia = await entrar('leticia@amigosdepatas.org');
    const resposta = await leticia.post(`/api/solicitacoes/${id}/mensagens`)
      .send({ conteudo: 'Pode sim, das 9h às 12h.' });
    expect(resposta.status).toBe(201);
    expect(resposta.body.mensagens).toHaveLength(2);
    expect(resposta.body.mensagens[0].remetente.nome).toBe('João Prado');
  });

  it('recusa mensagem vazia', async () => {
    const joao = await entrar('joao@exemplo.com');
    const minhas = await joao.get('/api/minhas-solicitacoes');
    const r = await joao.post(`/api/solicitacoes/${minhas.body.solicitacoes[0].id}/mensagens`)
      .send({ conteudo: '   ' });
    expect(r.status).toBe(400);
  });

  it('estranho não lê a conversa', async () => {
    const joao = await entrar('joao@exemplo.com');
    const minhas = await joao.get('/api/minhas-solicitacoes');
    const rita = await entrar('rita@exemplo.com');
    const r = await rita.get(`/api/solicitacoes/${minhas.body.solicitacoes[0].id}/mensagens`);
    expect(r.status).toBe(403);
  });
});

describe('assistente de cuidados (UC11, UC12, UC13)', () => {
  it('responde dúvida coberta pela base e cita a fonte (RNF12, RNF15)', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Quais vacinas meu cachorro precisa tomar todo ano?' });
    expect(r.status).toBe(200);
    expect(r.body.tipo).toBe('ok');
    expect(r.body.conteudo).toMatch(/antirrábica/i);
    expect(r.body.fontes.length).toBeGreaterThan(0);
    expect(r.body.fontes[0].fonte).toBeTruthy();
    expect(r.body.fontes[0].validadoPor).toBeTruthy();
    expect(Number(r.body.confianca)).toBeGreaterThanOrEqual(0.34);
  });

  it('atende visitante sem login (UC11)', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Quanto custa manter um cachorro por mês?' });
    expect(r.status).toBe(200);
    expect(r.body.tipo).toBe('ok');
    expect(r.body.idConversa).toBeTruthy();
  });

  it('recusa assunto fora do escopo sem tentar responder', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Qual a capital da Austrália?' });
    expect(r.body.tipo).toBe('fora');
    expect(r.body.fontes).toHaveLength(0);
    expect(r.body.ofereceEscalar).toBe(true);
  });

  it('cala quando a base não cobre a dúvida, em vez de inventar', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Meu cachorro pode fazer tratamento com acupuntura veterinária?' });
    expect(['baixa', 'ok']).toContain(r.body.tipo);
    if (r.body.tipo === 'baixa') {
      expect(r.body.conteudo).toMatch(/não encontrei/i);
      expect(r.body.fontes).toHaveLength(0);
    }
  });

  it('manda procurar veterinário antes de orientar, em sinal de urgência (RNF12)', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Meu cachorro está vomitando sangue e não come há dois dias' });
    expect(r.body.conteudo).toMatch(/veterinário o quanto antes/i);
  });

  it('pede mais contexto quando a pergunta é curta demais', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'vacina' });
    expect(r.body.tipo).toBe('curta');
  });

  it('não usa item desativado da base', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Com que frequência dar vermífugo para o cachorro?' });
    const titulos = (r.body.fontes || []).map((f) => f.titulo);
    expect(titulos).not.toContain('Vermifugação — versão antiga');
  });

  it('encaminha a dúvida para a ONG e ela aparece na fila (UC12)', async () => {
    const p = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Vocês aceitam doação de ração vencida?' });
    const id = p.body.idConversa;

    const e = await request(app).post(`/api/assistente/conversas/${id}/escalar`).send({});
    expect(e.status).toBe(200);
    expect(e.body.conversa.escaladaParaOng).toBe(true);

    const repetida = await request(app).post(`/api/assistente/conversas/${id}/escalar`).send({});
    expect(repetida.status).toBe(409);

    const leticia = await entrar('leticia@amigosdepatas.org');
    const fila = await leticia.get('/api/assistente/escaladas');
    expect(fila.body.conversas.some((c) => c.id === id)).toBe(true);

    const resposta = await leticia.post(`/api/assistente/conversas/${id}/responder`)
      .send({ conteudo: 'Ração vencida não, mas doação de ração na validade sim.' });
    expect(resposta.status).toBe(201);
    expect(resposta.body.mensagens.some((m) => m.origem === 'ong')).toBe(true);
  });

  it('a base de conhecimento é do responsável, não do voluntário (UC13, RNF03)', async () => {
    const luri = await entrar('luri@amigosdepatas.org');
    expect((await luri.get('/api/base-conhecimento')).status).toBe(403);

    const leticia = await entrar('leticia@amigosdepatas.org');
    const r = await leticia.get('/api/base-conhecimento');
    expect(r.status).toBe(200);
    expect(r.body.itens.length).toBeGreaterThanOrEqual(8);
  });

  it('recusa item de conhecimento sem fonte nem validador (RNF15)', async () => {
    const leticia = await entrar('leticia@amigosdepatas.org');
    const r = await leticia.post('/api/base-conhecimento').send({
      titulo: 'Item sem procedência', categoria: 'Saúde', conteudo: 'Texto qualquer.',
    });
    expect(r.status).toBe(400);
  });

  it('item novo passa a ser usado nas respostas (UC13)', async () => {
    const leticia = await entrar('leticia@amigosdepatas.org');
    const criado = await leticia.post('/api/base-conhecimento').send({
      titulo: 'Transporte seguro em viagens de carro',
      categoria: 'Comportamento',
      conteudo: 'Em viagens de carro o animal vai em caixa de transporte presa pelo cinto, ' +
        'nunca solto no banco nem com a cabeça para fora da janela.',
      termos: 'viagem viagens carro transporte caixa cinto estrada',
      fonte: 'Orientação da clínica parceira',
      validadoPor: 'Dra. Helena Prado',
    });
    expect(criado.status).toBe(201);

    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Como levar meu cachorro numa viagem de carro?' });
    expect(r.body.tipo).toBe('ok');
    expect(r.body.conteudo).toMatch(/caixa de transporte/i);
  });
});

// Cada teste aqui nasceu de um achado da esteira de segurança. Se alguém
// desfizer a correção, a esteira barra o merge.
describe('foto do animal (RF03)', () => {
  const sharp = require('sharp');
  const imagem = (largura, altura, formato = 'png') =>
    sharp({ create: { width: largura, height: altura, channels: 3, background: '#2F6B5A' } })
      [formato]().toBuffer();

  let leticia;
  let idNovo;
  beforeAll(async () => {
    leticia = await entrar('leticia@amigosdepatas.org');
    const r = await leticia.post('/api/animais')
      .send({ nome: 'Fotogênico', especie: 'Canina', porte: 'Médio' });
    idNovo = r.body.animal.id;
  });

  it('animal do catálogo público já vem com foto, e ela abre sem login', async () => {
    const lista = await request(app).get('/api/publico/animais?porPagina=50');
    const comFoto = lista.body.animais.find((a) => a.fotografia);
    expect(comFoto).toBeTruthy();
    const f = await request(app).get(comFoto.fotografia);
    expect(f.status).toBe(200);
    expect(f.headers['content-type']).toBe('image/webp');
    expect(f.headers['cache-control']).toMatch(/public/);
  });

  it('foto de animal fora do catálogo não abre para estranho (UC04)', async () => {
    const todos = await leticia.get('/api/animais');
    const adotado = todos.body.animais.find((a) => a.status === 'Adotado' && a.fotografia);
    expect((await request(app).get(`/api/animais/${adotado.id}/foto`)).status).toBe(404);
    const daEquipe = await leticia.get(`/api/animais/${adotado.id}/foto`);
    expect(daEquipe.status).toBe(200);
    expect(daEquipe.headers['cache-control']).toBe('private, no-store');
  });

  it('voluntário envia foto, e ela é guardada reduzida e em WebP', async () => {
    const luri = await entrar('luri@amigosdepatas.org');
    const r = await luri.put(`/api/animais/${idNovo}/foto`)
      .set('Content-Type', 'image/png').send(await imagem(1600, 1200));
    expect(r.status).toBe(200);
    expect(r.body.animal.fotografia).toMatch(new RegExp(`^/api/animais/${idNovo}/foto\\?v=\\d+$`));

    const f = await request(app).get(`/api/animais/${idNovo}/foto`);
    const info = await sharp(f.body).metadata();
    expect(info.format).toBe('webp');
    expect(Math.max(info.width, info.height)).toBeLessThanOrEqual(800);
  });

  it('recusa arquivo que não é imagem, mesmo com tipo de imagem', async () => {
    const r = await leticia.put(`/api/animais/${idNovo}/foto`)
      .set('Content-Type', 'image/png').send(Buffer.from('<script>alert(1)</script> nada de imagem'));
    expect(r.status).toBe(400);
    expect(r.body.erro).toMatch(/não é uma imagem/i);
  });

  it('recusa imagem corrompida com cabeçalho falso de JPG', async () => {
    const falso = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
    const r = await leticia.put(`/api/animais/${idNovo}/foto`)
      .set('Content-Type', 'image/jpeg').send(falso);
    expect(r.status).toBe(400);
  });

  it('recusa foto acima de 5 MB', async () => {
    const r = await leticia.put(`/api/animais/${idNovo}/foto`)
      .set('Content-Type', 'image/jpeg').send(Buffer.alloc(5 * 1024 * 1024 + 10));
    expect(r.status).toBe(413);
  });

  it('só a equipe da ONG troca a foto (RNF03)', async () => {
    const png = await imagem(100, 100);
    const sem = await request(app).put(`/api/animais/${idNovo}/foto`)
      .set('Content-Type', 'image/png').send(png);
    expect(sem.status).toBe(401);
    const maria = await entrar('maria@exemplo.com');
    const adotante = await maria.put(`/api/animais/${idNovo}/foto`)
      .set('Content-Type', 'image/png').send(png);
    expect(adotante.status).toBe(403);
  });

  it('o endereço da foto não se edita pelo cadastro', async () => {
    const r = await leticia.put(`/api/animais/${idNovo}`)
      .send({ fotografia: 'https://site-estranho.example/rastreio.gif' });
    expect(r.body.animal.fotografia).not.toMatch(/site-estranho/);
  });

  it('remover a foto volta o animal para a pata', async () => {
    const r = await leticia.delete(`/api/animais/${idNovo}/foto`);
    expect(r.body.animal.fotografia).toBeNull();
    expect((await request(app).get(`/api/animais/${idNovo}/foto`)).status).toBe(404);
  });
});

describe('base de conhecimento ampliada', () => {
  it.each([
    ['Como faço o RG do meu pet?', 'RG animal: cadastro no SinPatinhas'],
    ['Meu gato pode ficar perto de lírio?', 'Plantas perigosas: o lírio e os gatos'],
    ['Achei um carrapato no meu cão, o que faço?', 'Carrapatos e a doença do carrapato'],
    ['Meu cachorro fica tremendo com medo de fogos, como ajudar?', 'Medo de fogos e trovões'],
    ['Como funciona o processo de adoção?', 'Como funciona a adoção pelo ConnectPatas'],
  ])('"%s" é respondida pelo item certo', async (pergunta, titulo) => {
    const r = await request(app).post('/api/assistente/perguntar').send({ pergunta });
    expect(r.body.tipo).toBe('ok');
    expect(r.body.fontes[0].titulo).toBe(titulo);
  });
});

describe('assistente com a IA do Groq (provedor externo)', () => {
  const PERGUNTA = 'Quais vacinas meu cachorro precisa tomar todo ano?';
  let chamada;

  const respostaGroq = (texto) => ({
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: { content: texto } }] }),
  });

  beforeEach(() => {
    process.env.AGENTE_MODO = 'groq';
    process.env.AGENTE_CHAVE_API = 'chave-falsa-de-teste';
    chamada = jest.spyOn(global, 'fetch');
  });
  afterEach(() => {
    chamada.mockRestore();
    delete process.env.AGENTE_MODO;
    delete process.env.AGENTE_CHAVE_API;
  });

  it('usa o texto da IA e mantém as fontes da base da ONG', async () => {
    chamada.mockResolvedValue(respostaGroq('Todo ano ele precisa da V10 e da antirrábica.'));
    const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: PERGUNTA });
    expect(r.body.tipo).toBe('ok');
    expect(r.body.modo).toBe('groq');
    expect(r.body.conteudo).toBe('Todo ano ele precisa da V10 e da antirrábica.');
    expect(r.body.fontes.length).toBeGreaterThan(0);

    // A IA recebe a pergunta e os itens da base, e mais nada.
    const [url, opcoes] = chamada.mock.calls[0];
    expect(url).toMatch(/api\.groq\.com/);
    expect(opcoes.headers.Authorization).toBe('Bearer chave-falsa-de-teste');
    const corpo = JSON.parse(opcoes.body);
    expect(corpo.messages[1].content).toContain(PERGUNTA);
    expect(corpo.messages[1].content).toMatch(/antirrábica/i);
  });

  it('volta para o modo simulado quando o limite grátis acaba (429)', async () => {
    chamada.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: PERGUNTA });
    expect(r.body.tipo).toBe('ok');
    expect(r.body.modo).toBe('simulado');
    expect(r.body.conteudo).toMatch(/antirrábica/i);
  });

  it('volta para o modo simulado quando o Groq está fora do ar', async () => {
    chamada.mockRejectedValue(new TypeError('fetch failed'));
    const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: PERGUNTA });
    expect(r.body.modo).toBe('simulado');
    expect(r.body.conteudo).toMatch(/antirrábica/i);
  });

  it('o aviso de urgência vem do código, mesmo que a IA não o escreva', async () => {
    chamada.mockResolvedValue(respostaGroq('Ofereça água fresca e observe.'));
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Meu cachorro está vomitando sangue e não come há dois dias' });
    expect(r.body.conteudo).toMatch(/^Pelo que você descreveu, o caminho é procurar um veterinário/);
  });

  describe('busca na internet quando a base não cobre a dúvida', () => {
    const SEM_BASE = 'Qual a melhor raça de cachorro para apartamento?';
    const respostaWeb = (texto) => ({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: texto } }] }),
    });

    it('responde com o que achou e mostra os links das páginas', async () => {
      chamada.mockResolvedValue(respostaWeb(
        'Raças pequenas e calmas costumam se adaptar bem a apartamento 【1†L2-L4】.\n'
        + 'FONTES:\n'
        + '- Guia do CRMV | https://www.crmvsp.gov.br/guia\n'
        + '- javascript:alert(1)\n'
      ));
      const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: SEM_BASE });
      expect(r.body.tipo).toBe('web');
      expect(r.body.modo).toBe('groq-web');
      expect(r.body.conteudo).toBe('Raças pequenas e calmas costumam se adaptar bem a apartamento.');
      // só endereço http(s) vira fonte; o resto é descartado
      expect(r.body.fontes).toEqual([
        { titulo: 'Guia do CRMV', url: 'https://www.crmvsp.gov.br/guia', fonte: 'Internet', validadoPor: null },
      ]);
      // não validado pela ONG: o botão de encaminhar continua
      expect(r.body.ofereceEscalar).toBe(true);
      const corpo = JSON.parse(chamada.mock.calls[0][1].body);
      expect(corpo.tools).toEqual([{ type: 'browser_search' }]);
    });

    it('a IA recusa o que escapou da trava de palavras', async () => {
      chamada.mockResolvedValue(respostaWeb('FORA_DO_ESCOPO'));
      const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: SEM_BASE });
      expect(r.body.tipo).toBe('fora');
      expect(r.body.fontes).toHaveLength(0);
    });

    it('resposta da internet sem nenhuma fonte não é mostrada', async () => {
      chamada.mockResolvedValue(respostaWeb('Qualquer raça serve.'));
      const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: SEM_BASE });
      expect(r.body.tipo).toBe('baixa');
      expect(r.body.conteudo).toMatch(/não encontrei/i);
    });

    it('aproveita as páginas registradas pela ferramenta de busca', async () => {
      chamada.mockResolvedValue({
        ok: true, status: 200,
        json: async () => ({ choices: [{ message: {
          content: 'Raças pequenas costumam se adaptar bem.',
          executed_tools: [{ type: 'browser.search', search_results: { results: [
            { title: 'Hospital Veterinário', url: 'https://hv.exemplo.edu.br/apto' },
          ] } }],
        } }] }),
      });
      const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: SEM_BASE });
      expect(r.body.tipo).toBe('web');
      expect(r.body.fontes[0].url).toBe('https://hv.exemplo.edu.br/apto');
    });

    it('sem busca ligada, segue dizendo que não sabe', async () => {
      process.env.AGENTE_BUSCA_WEB = 'nao';
      const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: SEM_BASE });
      delete process.env.AGENTE_BUSCA_WEB;
      expect(r.body.tipo).toBe('baixa');
      expect(chamada).not.toHaveBeenCalled();
    });

    it('se a busca falhar, segue dizendo que não sabe', async () => {
      chamada.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
      const r = await request(app).post('/api/assistente/perguntar').send({ pergunta: SEM_BASE });
      expect(r.body.tipo).toBe('baixa');
    });
  });

  it('assunto fora do escopo nem chega à IA', async () => {
    const r = await request(app).post('/api/assistente/perguntar')
      .send({ pergunta: 'Qual a capital da Austrália?' });
    expect(r.body.tipo).toBe('fora');
    expect(chamada).not.toHaveBeenCalled();
  });
});

describe('proteções vindas da esteira de segurança (SAST, DAST)', () => {
  it('não anuncia a tecnologia do servidor', async () => {
    const r = await request(app).get('/api/publico/animais?porPagina=50');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  it('envia os cabeçalhos de proteção que o ZAP cobra', async () => {
    const r = await request(app).get('/api/publico/animais?porPagina=50');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  });

  it('JSON malformado é erro do cliente, não do servidor', async () => {
    const r = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json').send('{malformado');
    expect(r.status).toBe(400);
  });

  it('não devolve credenciais para origem desconhecida (CORS)', async () => {
    const r = await request(app).get('/api/publico/animais?porPagina=50')
      .set('Origin', 'https://site-malicioso.example');
    expect(r.headers['access-control-allow-origin']).not.toBe('https://site-malicioso.example');
  });

  it('o cookie de sessão sai com HttpOnly e SameSite=Lax (CSRF)', async () => {
    const r = await request(app).post('/api/auth/login')
      .send({ email: 'maria@exemplo.com', senha: SENHA });
    const cookie = r.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('freia força bruta no login depois de 10 falhas', async () => {
    const alvo = { email: 'forca-bruta@exemplo.com', senha: 'errada' };
    for (let i = 0; i < 10; i += 1) {
      const r = await request(app).post('/api/auth/login').send(alvo);
      expect(r.status).toBe(400);
    }
    const travado = await request(app).post('/api/auth/login').send(alvo);
    expect(travado.status).toBe(429);
    expect(travado.headers['retry-after']).toBeTruthy();
  });

  it('o freio não atrapalha quem acerta a senha', async () => {
    const r = await request(app).post('/api/auth/login')
      .send({ email: 'leticia@amigosdepatas.org', senha: SENHA });
    expect(r.status).toBe(200);
  });
});
