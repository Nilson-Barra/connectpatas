# ConnectPatas

Plataforma web para ONGs de proteção animal gerenciarem animais acolhidos,
adotantes e o processo de adoção responsável.

Projeto do curso de Análise e Desenvolvimento de Sistemas —
IFSP Campus Hortolândia. Letícia Capovila, Luri Serdan e Nilson Barra.

A especificação técnica está em `docs/`. Quando este README e o documento
divergirem, o documento manda: ajuste o código, não a documentação.

## O que já está pronto

- Modelo de dados completo: as 11 tabelas do DER (Figura 11), com as
  chaves, os enums e a busca textual da base de conhecimento.
- Autenticação por sessão, com os três perfis do documento.
- Módulo de ONG e animais (RF01 a RF04, RF10, RF12) com as regras do UC02,
  UC03 e UC04.
- Processo de adoção completo (UC05, UC06, UC07): solicitação, análise,
  aprovação e conclusão, com as transições do diagrama de máquina de estados
  (Figura 8) e o status do animal acompanhando o processo.
- Mensagens entre adotante e ONG dentro da solicitação (UC08).
- Painel do responsável com o resumo de animais e de solicitações (UC09).
- Massa de dados de demonstração.
- 29 testes automatizados cobrindo autenticação, autorização por perfil, as
  regras de cadastro e o processo de adoção inteiro.

- Frontend em React cobrindo as telas do catálogo, ficha do animal,
  solicitação, acompanhamento do adotante, fila da ONG, cadastro de animais e
  painel do responsável.

Ainda não implementado: o assistente de cuidados (UC11 a UC13) e o cadastro
de contas pela tela — hoje as contas vêm da massa de demonstração.

## Requisitos

- Node.js 20 ou superior
- Um banco PostgreSQL 14+

## Começando

### 1. Banco de dados

A opção combinada é o Neon, gratuito e sem cartão:

1. Entre em neon.tech e crie uma conta.
2. Crie um projeto chamado `connectpatas`.
3. Crie dois bancos: `connectpatas` e `connectpatas_test`.
4. Copie a connection string de cada um (botão *Connect*).

O código funciona em qualquer PostgreSQL. Para rodar local em vez do Neon,
use `postgresql://postgres:senha@localhost:5432/connectpatas`.

O banco de teste precisa ser separado: a suíte apaga e recria as tabelas a
cada execução. Apontar os dois para o mesmo banco apaga os dados de todo mundo.

### 2. Backend

```bash
cd backend
cp .env.example .env     # preencha DATABASE_URL, DATABASE_URL_TEST e SESSION_SECRET
npm install
npm run db:migrate       # cria as tabelas
npm run db:seed          # carrega os dados de demonstração
npm run dev              # sobe a API em http://localhost:3001
```

Para gerar o `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Confira se subiu: `curl http://localhost:3001/api/saude` deve devolver `{"ok":true}`.

### 3. Frontend

Noutro terminal, com o backend rodando:

```bash
cd frontend
npm install
npm run dev              # abre em http://localhost:5173
```

O Vite encaminha tudo que começa com `/api` para a porta 3001. Por isso o
navegador enxerga frontend e API no mesmo endereço, e o cookie de sessão vai
junto sem depender de CORS — que é a causa mais comum de "funciona no Postman
e não no navegador".

## Como testar

### Suíte automatizada

```bash
cd backend
npm test
```

São 16 testes. Eles usam o `DATABASE_URL_TEST`, e antes de começar apagam e
recriam as tabelas desse banco — por isso ele precisa ser separado. O banco de
desenvolvimento não é tocado.

Os testes cobrem login e logout, o bloqueio de área privada sem sessão, as
permissões dos três perfis (RNF03), a regra do catálogo público (UC04) e as
regras de cadastro de animal. Se algum falhar, o nome do teste já diz qual
regra do documento quebrou.

Para rodar só um pedaço: `npm test -- -t "UC04"`.

### Teste de fumaça (API inteira, de ponta a ponta)

```bash
npm run dev            # num terminal
./scripts/fumaca.sh    # noutro
```

O script percorre o caminho principal do sistema — catálogo público, login dos
três perfis, cadastro de animal, painel, logout — e confere o código de
resposta de cada passo. No fim imprime quantos passaram. É a etapa 8 do plano
de implantação (Seção 6.3) e serve para responder rápido à pergunta "a API
subiu inteira?", inclusive depois do deploy: `./scripts/fumaca.sh https://sua-url`.

Ele deixa dois animais de teste cadastrados. `npm run db:reset` limpa.

### Na mão, para olhar as respostas

Sem login, `curl` resolve:

```bash
curl http://localhost:3001/api/publico/animais | head -c 400
```

Com login é preciso guardar o cookie de sessão, senão a requisição seguinte
chega como visitante:

```bash
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"leticia@amigosdepatas.org","senha":"connectpatas"}'

curl -b cookies.txt http://localhost:3001/api/painel
```

No Postman ou no Insomnia não precisa disso: eles guardam o cookie sozinhos.
Faça o `POST /api/auth/login` uma vez e as outras requisições já vão
autenticadas.

Códigos que você vai ver: **401** é "não sei quem você é" (falta login),
**403** é "sei quem você é, mas esse perfil não pode", **400** é dado inválido
e **409** é regra de negócio violada (editar à mão o status de um animal que
está em processo de adoção).

### Esteira (GitHub Actions)

Todo pull request para a `main` passa por `.github/workflows/esteira.yml`:
build e testes, SAST (Semgrep e Gitleaks), SCA (npm audit, Dependency Review,
Dependabot) e DAST (teste de fumaça e OWASP ZAP). O check "Portão" só fica
verde com os quatro estágios aprovados — configure-o como obrigatório em
Settings → Branches → proteção da `main`.

Achado que não vira correção precisa de justificativa em
`docs/seguranca/triagem.md`.

Para mostrar o sistema de fora (túnel, demonstração), use o build:
`npm run build && npx vite preview` no frontend. Nunca exponha o `npm run dev`
na internet: o servidor de desenvolvimento tem falhas conhecidas que o build
não tem.

## Usuários de demonstração

Todos com a senha `connectpatas`.

| E-mail | Perfil |
|---|---|
| leticia@amigosdepatas.org | Responsável pela ONG |
| luri@amigosdepatas.org | Voluntário da ONG |
| maria@exemplo.com | Adotante |

## Endpoints

Público, sem login:

- `GET /api/publico/animais` — animais disponíveis. Aceita `especie`, `porte`,
  `texto`, `pagina` e `porPagina`.
- `GET /api/publico/animais/:id` — ficha de um animal disponível.

Autenticação:

- `POST /api/auth/login` — corpo `{ email, senha }`.
- `POST /api/auth/logout`
- `GET /api/auth/eu` — quem está logado.

Área da ONG (responsável e voluntário):

- `GET /api/ong`, `GET /api/animais`, `POST /api/animais`,
  `GET /api/animais/:id`, `PUT /api/animais/:id`
- `GET /api/solicitacoes` — a fila de adoções. Aceita `status`.
- `PUT /api/solicitacoes/:id/status` — corpo `{ status, observacoes }`.

Só o responsável:

- `PUT /api/ong`, `GET /api/painel`

Só o adotante:

- `POST /api/animais/:id/solicitacoes` — abre a solicitação (UC05).
- `GET /api/minhas-solicitacoes` — acompanha o andamento.

Os dois lados da solicitação:

- `GET /api/solicitacoes/:id`
- `GET /api/solicitacoes/:id/mensagens`, `POST /api/solicitacoes/:id/mensagens`

## Decisões que valem conhecer antes de mexer no código

**Sessão com cookie, não token no navegador.** O cookie é `httpOnly`, então
nenhum JavaScript da página consegue lê-lo, e uma falha de XSS não entrega a
sessão de ninguém. A sessão fica na tabela `sessao`: o logout apaga a linha e
o cookie antigo deixa de valer na hora. Com token isso não acontece sem uma
lista de revogados.

**A senha nunca aparece.** Guardamos só o hash bcrypt, o model remove o campo
de qualquer resposta, e e-mail inexistente e senha errada devolvem a mesma
mensagem — dizer qual dos dois falhou entrega quais e-mails existem.

**Os três perfis são tabelas, a autorização é um campo.** O modelo segue o DER:
`usuario` como base e `responsavel_ong`, `voluntario_ong` e `adotante`
especializando. Mas o middleware lê `tipo_usuario` direto na sessão, em vez
de consultar três tabelas a cada requisição.

A divisão entre os dois perfis da ONG vem dos casos de uso: painel (UC09),
base de conhecimento (UC13) e dados da ONG (UC01) são exclusivos do
responsável; animais e solicitações os dois fazem.

**O status do animal não se edita à mão.** Quem muda é o processo de adoção.
Tentar editar o status de um animal em processo devolve 409. Sem isso, dá para
deixar um animal "Disponível" com uma solicitação aberta, que é exatamente a
incoerência que o UC05 existe para evitar.

**O processo de adoção é uma máquina de estados, não um campo livre.** De
`Pendente` só se vai para `Em análise` ou `Recusada`; de `Em análise` para
`Aprovada` ou `Recusada`; de `Aprovada` para `Concluída` ou `Recusada`. Pular
etapa devolve 400 e mexer em processo encerrado devolve 409. As transições
estão em `modulos/adocao/servico.js`, uma tabela só, espelhando a Figura 8.

**Solicitação e status do animal mudam juntos ou não mudam.** Abrir a
solicitação põe o animal em "Em processo de adoção", concluir põe em "Adotado"
e recusar devolve para "Disponível". Tudo dentro de uma transação: se um lado
falhar, o outro não vale. Sem isso dá para um animal ficar "Disponível" com
adoção concluída, que é a incoerência que o UC05 existe para evitar.

**O catálogo público filtra no repositório, não na tela.** A regra do UC04 vive
em `modulos/animal/servico.js`. Filtrar só no frontend deixaria a API expondo
animal adotado para quem chamasse direto.

**Nada de SQL nos módulos de negócio.** Eles falam com os repositórios
(`modulos/*/repositorio.js`), que encapsulam o ORM. É o padrão Repository da
Seção 7.3, e é o que permite testar a regra sem banco.

## Estrutura

```
backend/
  src/
    config/        conexão e configuração do Sequelize
    migrations/    evolução do banco, versionada
    seeders/       massa de demonstração
    models/        um model por entidade do DER
    middlewares/   autenticação, autorização e tratamento de erros
    modulos/       seguranca, ong, animal, adocao — cada um com rotas, serviço e repositório
    comum/         erros e utilitários compartilhados
  tests/
frontend/
  src/
    paginas/       uma tela por arquivo
    componentes.jsx  peças reaproveitadas
    api.js         única porta de saída para a API
    sessao.jsx     quem está logado, perguntado ao servidor
docs/
  specs/           especificações do SDD (Seção 10.9)
```

## Convenções

Branches seguem o GitHub Flow: `main` sempre implantável, `feature/<nome>` e
`fix/<nome>` saindo dela, removidas depois do merge. Nada entra na `main` sem
pull request revisado por outro integrante.

Commits começam com verbo no infinitivo e citam o requisito quando houver:
`implementar cadastro de animal (RF02)`.

Versões seguem SemVer. Durante o MVP ficamos em `0.x.y`; a entrega final é a
`1.0.0`.

## Quando algo dá errado

**`DATABASE_URL não definida`** — falta copiar `.env.example` para `.env`.

**`relation "..." does not exist`** — faltou `npm run db:migrate`.

**A primeira requisição demora alguns segundos** — o plano gratuito do Neon
hiberna o banco quando fica parado. Abra o sistema uns minutos antes de
apresentar.

**Cookie não persiste entre frontend e backend** — em desenvolvimento os dois
rodam em portas diferentes. Confirme `ORIGEM_FRONTEND` no `.env` e use
`credentials: 'include'` no `fetch` do frontend.

**Recomeçar do zero** — `npm run db:reset` desfaz as migrations, recria tudo
e recarrega a massa de demonstração.
