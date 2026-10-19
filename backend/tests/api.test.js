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

describe('consulta pública de animais (UC04)', () => {
  it('lista somente animais disponíveis', async () => {
    const r = await request(app).get('/api/publico/animais');
    expect(r.status).toBe(200);
    expect(r.body.animais.length).toBeGreaterThan(0);
    r.body.animais.forEach((a) => expect(a.status).toBe('Disponível'));
  });

  it('filtra por espécie', async () => {
    const r = await request(app).get('/api/publico/animais?especie=Felina');
    r.body.animais.forEach((a) => expect(a.especie).toBe('Felina'));
  });

  it('não expõe animal fora de disponível', async () => {
    const todos = await request(app).get('/api/publico/animais');
    const disponiveis = todos.body.animais.map((a) => a.id);
    const agente = await entrar('leticia@amigosdepatas.org');
    const daOng = await agente.get('/api/animais');
    const adotado = daOng.body.animais.find((a) => a.status === 'Adotado');
    expect(adotado).toBeTruthy();
    expect(disponiveis).not.toContain(adotado.id);
    expect((await request(app).get(`/api/publico/animais/${adotado.id}`)).status).toBe(404);
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
    const r = await request(app).get('/api/publico/animais');
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
    const publico = await request(app).get('/api/publico/animais');
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

    const publico = await request(app).get('/api/publico/animais');
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
describe('proteções vindas da esteira de segurança (SAST, DAST)', () => {
  it('não anuncia a tecnologia do servidor', async () => {
    const r = await request(app).get('/api/publico/animais');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  it('envia os cabeçalhos de proteção que o ZAP cobra', async () => {
    const r = await request(app).get('/api/publico/animais');
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
    const r = await request(app).get('/api/publico/animais')
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
