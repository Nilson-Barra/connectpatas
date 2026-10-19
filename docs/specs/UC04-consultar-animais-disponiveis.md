# UC04 — Consultar Animais Disponíveis

Requisitos: RF10, RF12
História: US04
Implementado em: `backend/src/modulos/animal/`

## Objetivo

Permitir que qualquer visitante, autenticado ou não, veja os animais que a ONG
disponibilizou para adoção.

## Entrada

`GET /api/publico/animais`, todos os parâmetros opcionais:

| Parâmetro | Valores | Padrão |
|---|---|---|
| `especie` | Canina, Felina, Outra | todas |
| `porte` | Pequeno, Médio, Grande | todos |
| `texto` | busca em nome, raça e características | — |
| `pagina` | inteiro ≥ 1 | 1 |
| `porPagina` | inteiro, máximo 50 | 12 |

## Saída

`200` com `{ animais: [...], total: <inteiro> }`. Cada animal traz os campos
cadastrais e a ONG a que pertence (id, nome, cidade).

## Regras

1. Somente animais com status `Disponível` entram na resposta. Esta é a regra
   de negócio do caso de uso e vale também para a consulta por id: animal em
   processo de adoção ou adotado responde `404`, não `403`, porque a existência
   dele não é informação pública.
2. A filtragem acontece no repositório, nunca só na interface.
3. A ordenação padrão é por data de cadastro, do mais recente para o mais antigo.
4. `porPagina` acima de 50 é reduzido a 50, sem erro.

## Casos de teste

| ID | Cenário | Esperado |
|---|---|---|
| CT05 | Consultar sem filtros | Só animais com status Disponível |
| — | Filtrar por espécie Felina | Todos os retornados são felinos |
| — | Consultar por id um animal adotado | 404 |

Implementados em `backend/tests/api.test.js`, bloco "consulta pública de
animais (UC04)".
