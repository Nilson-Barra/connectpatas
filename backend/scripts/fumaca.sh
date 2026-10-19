#!/usr/bin/env bash
# Teste de fumaça da API do ConnectPatas.
#
# Percorre o caminho principal do sistema e confere o código de resposta de
# cada passo. É a etapa 8 do plano de implantação (Seção 6.3) e serve para
# responder rápido à pergunta "a API subiu inteira?".
#
# Uso:  ./scripts/fumaca.sh [url]
# Ex.:  ./scripts/fumaca.sh http://localhost:3001
#
# Roda contra o banco de desenvolvimento e deixa dois animais de teste
# cadastrados. 'npm run db:reset' limpa.

set -u
export LC_ALL=C.UTF-8   # para os acentos não desalinharem a tabela
API="${1:-http://localhost:3001}"
SENHA="connectpatas"
COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

ok=0; falhou=0

# chamar <esperado> <descrição> <método> <caminho> [corpo json]
chamar() {
  local esperado="$1" desc="$2" metodo="$3" caminho="$4" corpo="${5:-}"
  local args=(-s -o /tmp/fumaca.out -w '%{http_code}'
              -c "$COOKIES" -b "$COOKIES"
              -X "$metodo" "$API$caminho")
  [ -n "$corpo" ] && args+=(-H 'Content-Type: application/json' -d "$corpo")

  local codigo
  codigo=$(curl "${args[@]}")

  # ${#desc} conta caracteres, não bytes: alinha mesmo com acento.
  local recheio=""
  local n=$(( 54 - ${#desc} ))
  while [ "$n" -gt 0 ]; do recheio="$recheio."; n=$((n-1)); done

  if [ "$codigo" = "$esperado" ]; then
    echo "  ok    $desc $recheio $codigo"
    ok=$((ok+1))
  else
    echo "  FALHA $desc $recheio $codigo (esperado $esperado)"
    echo "        resposta: $(head -c 200 /tmp/fumaca.out)"
    falhou=$((falhou+1))
  fi
}

sair() { rm -f "$COOKIES"; printf '\n%s\n' "$1"; exit "${2:-0}"; }

echo
echo "Testando $API"
echo

if ! curl -s -f -o /dev/null "$API/api/saude"; then
  sair "A API não respondeu em $API. Suba com 'npm run dev' antes." 1
fi

echo "Área pública (UC04 — sem login)"
chamar 200 "catálogo de animais disponíveis"            GET  "/api/publico/animais"
chamar 200 "filtro por espécie"                          GET  "/api/publico/animais?especie=Felina"
# 401 é "não sei quem você é" e 403 é "sei, mas não pode".
# Sem sessão, tudo o que é privado responde 401.
chamar 401 "área privada bloqueada sem sessão"           GET  "/api/auth/eu"
chamar 401 "área da ONG bloqueada sem sessão"            GET  "/api/animais"

echo
echo "Autenticação (RNF03)"
chamar 400 "senha errada é recusada"                     POST "/api/auth/login" \
  '{"email":"leticia@amigosdepatas.org","senha":"errada"}'
chamar 400 "e-mail inexistente dá a mesma resposta"      POST "/api/auth/login" \
  '{"email":"ninguem@exemplo.com","senha":"'"$SENHA"'"}'
chamar 200 "login do responsável pela ONG"               POST "/api/auth/login" \
  '{"email":"leticia@amigosdepatas.org","senha":"'"$SENHA"'"}'
chamar 200 "sessão reconhecida depois do login"          GET  "/api/auth/eu"

echo
echo "Perfil responsável (UC01, UC09)"
chamar 200 "dados da ONG"                                GET  "/api/ong"
chamar 200 "painel de acompanhamento"                    GET  "/api/painel"
chamar 200 "lista de animais da ONG"                     GET  "/api/animais"
chamar 201 "cadastrar animal"                            POST "/api/animais" \
  '{"nome":"Teste de Fumaça","especie":"Canina","idade":"2 anos","porte":"Médio"}'
chamar 400 "animal sem nome é recusado"                  POST "/api/animais" \
  '{"especie":"Canina"}'

echo
echo "Fila de adoções (UC06)"
chamar 200 "solicitações da ONG"                         GET  "/api/solicitacoes"
chamar 200 "filtro por status"                           GET  "/api/solicitacoes?status=Pendente"

echo
echo "Fim da sessão"
chamar 204 "logout"                                      POST "/api/auth/logout"
chamar 401 "sessão morreu depois do logout"              GET  "/api/auth/eu"

echo
echo "Perfil voluntário (RNF03 — permissões menores)"
chamar 200 "login do voluntário"                         POST "/api/auth/login" \
  '{"email":"luri@amigosdepatas.org","senha":"'"$SENHA"'"}'
chamar 201 "voluntário cadastra animal"                  POST "/api/animais" \
  '{"nome":"Teste Voluntário","especie":"Felina","idade":"1 ano","porte":"Pequeno"}'
chamar 403 "voluntário NÃO acessa o painel"              GET  "/api/painel"
chamar 403 "voluntário NÃO edita os dados da ONG"        PUT  "/api/ong" '{"nome":"X"}'
chamar 204 "logout"                                      POST "/api/auth/logout"

echo
echo "Perfil adotante (UC05, UC07)"
chamar 200 "login do adotante"                           POST "/api/auth/login" \
  '{"email":"maria@exemplo.com","senha":"'"$SENHA"'"}'
chamar 403 "adotante NÃO acessa a área da ONG"           GET  "/api/animais"
chamar 403 "adotante NÃO acessa o painel"                GET  "/api/painel"
chamar 200 "acompanha as próprias solicitações"          GET  "/api/minhas-solicitacoes"
chamar 403 "adotante NÃO vê a fila da ONG"               GET  "/api/solicitacoes"
chamar 204 "logout"                                      POST "/api/auth/logout"

echo
echo "-----------------------------------------------"
printf 'passaram: %d   falharam: %d\n' "$ok" "$falhou"
[ "$falhou" -eq 0 ] && sair "Tudo certo." 0 || sair "Teve falha. Veja acima." 1
