const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const { sequelize } = require('./models');
const tratarErros = require('./middlewares/erros');
const { cabecalhos, politicaDaApi } = require('./middlewares/protecao');
const rotasSeguranca = require('./modulos/seguranca/rotas');
const rotasOng = require('./modulos/ong/rotas');
const rotasAnimal = require('./modulos/animal/rotas');
const rotasAdocao = require('./modulos/adocao/rotas');
const rotasAssistente = require('./modulos/assistente/rotas');

// A mesma política que o vite preview manda (frontend/vite.config.js) e que o
// DAST da esteira examina: fontes do Google Fonts, todo o resto do próprio site.
const POLITICA_DAS_TELAS = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function criarApp() {
  const app = express();
  const producao = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1); // atrás do proxy do serviço de hospedagem
  // Achado do DAST: o cabeçalho X-Powered-By anunciava "Express" a quem
  // perguntasse. Não esconde nada de um atacante decidido, mas não há motivo
  // para entregar de graça a primeira peça do reconhecimento.
  app.disable('x-powered-by');
  app.use(cabecalhos);
  app.use('/api', politicaDaApi);
  app.use(express.json({ limit: '1mb' }));

  // Em desenvolvimento o frontend roda noutra porta, então precisa de CORS
  // com credenciais. Em produção os dois são servidos da mesma origem e
  // essa configuração deixa de ser necessária.
  //
  // Achado da revisão do SAST: o valor reserva era `true`, que no pacote cors
  // significa "aceitar qualquer origem". Sem ORIGEM_FRONTEND configurada,
  // qualquer site da internet faria requisições com o cookie de quem está
  // logado e leria a resposta. Agora, sem a variável, CORS fica desligado —
  // que é o certo quando frontend e API moram no mesmo endereço.
  app.use(cors({ origin: process.env.ORIGEM_FRONTEND || false, credentials: true }));

  // A tabela de sessões vem da migration; o store recebe o model pronto.
  // 'table' aqui é o NOME DO MODEL já registrado, não o nome da tabela:
  // é assim que a biblioteca reaproveita a tabela criada pela migration
  // em vez de inventar uma própria.
  const store = new SequelizeStore({ db: sequelize, table: 'Sessao' });

  // Achado do SAST: havia um segredo reserva fixo aqui. Publicar sem
  // SESSION_SECRET subia o sistema assinando sessões com um texto que está no
  // repositório, legível por qualquer um. Em produção, sem segredo, não sobe.
  const segredo = process.env.SESSION_SECRET;
  if (producao && (!segredo || segredo.length < 32)) {
    throw new Error('SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres) em produção.');
  }

  app.use(session({
    name: 'connectpatas.sid',
    secret: segredo || 'inseguro-apenas-para-desenvolvimento-e-testes',
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,            // fora do alcance de qualquer JavaScript da página
      secure: producao,          // só por HTTPS quando publicado
      // Achado do SAST (CSRF): era 'none' em produção, o que deixava outro site
      // disparar ações com a sessão de quem está logado. Como frontend e API
      // são publicados no mesmo endereço, 'lax' basta e fecha essa porta.
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
    },
  }));

  app.get('/api/saude', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', rotasSeguranca);
  app.use('/api', rotasOng);
  app.use('/api', rotasAnimal);
  app.use('/api', rotasAdocao);
  app.use('/api', rotasAssistente);

  // Em produção a própria API entrega as telas (o build do frontend), num
  // endereço só. Assim o cookie de sessão é do mesmo site e não precisa de
  // CORS. Em desenvolvimento quem serve as telas continua sendo o Vite.
  const telas = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
  if (producao && fs.existsSync(path.join(telas, 'index.html'))) {
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api')) res.setHeader('Content-Security-Policy', POLITICA_DAS_TELAS);
      next();
    });
    // Arquivos com hash no nome (assets/) nunca mudam: cache longo.
    app.use('/assets', express.static(path.join(telas, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(telas, { index: false, maxAge: 0 }));
    // Qualquer outro endereço que não seja da API é uma tela do React
    // (/animais/12, /painel...): devolve o index.html e o roteador resolve.
    app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(telas, 'index.html'));
    });
  }

  app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use(tratarErros);

  return app;
}

module.exports = { criarApp };
