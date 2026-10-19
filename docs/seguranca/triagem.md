# Triagem dos achados de segurança

Todo achado que a esteira aponta e que NÃO vira correção precisa de uma linha
aqui: o que é, por que não se aplica, quem decidiu e quando revisar. Achado sem
justificativa escrita é achado aberto.

## SAST (Semgrep)

| Regra | Onde | Decisão | Por quê |
|---|---|---|---|
| express-cookie-session-no-secure | backend/src/app.js | Falso positivo | `secure` é ligado em produção por condição; a regra não avalia a condição. Coberto por teste. |
| express-cookie-session-no-expires | backend/src/app.js | Falso positivo | Usamos `maxAge` (8 horas), que define a expiração. |
| express-cookie-session-no-domain | backend/src/app.js | Falso positivo | Sem `domain` o cookie vale só para o próprio host — é a opção mais restrita. |
| express-cookie-session-no-path | backend/src/app.js | Falso positivo | O padrão é `/`, que é o desejado. |
| sequelize-raw-query | migrations 0200 e 0300, no `down` | Falso positivo | O nome interpolado vem de uma lista fixa no próprio arquivo; não há entrada de usuário. |
| useless-assignment | 11 arquivos, linha de `require` | Falso positivo | O analisador lê a desestruturação `const { a } = require(...)` como dupla atribuição. |

Corrigidos (não precisam de exceção): falta de proteção CSRF com
`SameSite=None` em produção; segredo de sessão com valor reserva fixo; CORS
aceitando qualquer origem sem `ORIGEM_FRONTEND`.

## SCA (npm audit)

| Pacote | Severidade | Decisão | Por quê | Revisar |
|---|---|---|---|---|
| uuid (via sequelize 6) | Moderada | Aceito | A falha só ocorre ao chamar uuid com um buffer de saída; nem o projeto nem o sequelize fazem isso. Não há correção dentro do sequelize 6. | Mensal, ou quando sair sequelize 7 estável |
| react-router / react-router-dom 6 | Moderada | Aceito por ora | Redirecionamento aberto com barra invertida em `<Link>`/`useNavigate`. O projeto só navega para caminhos montados com ids numéricos vindos da API, nunca com texto do usuário. A correção exige migrar para a versão 7. | Mensal |
| vite 5 / esbuild | Alta (dev) | Aceito com regra | Afeta só o servidor de desenvolvimento, que não vai ao ar. Regra: nunca expor `npm run dev` na internet; túnel e DAST usam `vite preview`. Correção exige vite 8. | Mensal |

## DAST

Nenhuma exceção aberta. Os achados da primeira rodada foram corrigidos e
travados por teste (ver `backend/tests/api.test.js`, bloco "proteções vindas
da esteira de segurança").
