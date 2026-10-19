# Especificações (SDD)

A Seção 10.9 do Documento Técnico define que a codificação do agente de
atendimento é guiada por especificação: o arquivo escrito aqui é o artefato
principal, o código é derivado dele e os testes verificam o código contra ele.

Como funciona na prática:

1. A especificação consolida o caso de uso, os requisitos não funcionais e os
   critérios de aceitação das histórias relacionadas, descrevendo entradas,
   saídas, comportamento esperado e os casos em que o sistema deve recusar.
2. Ela é decomposta em tarefas técnicas.
3. O código é escrito a partir dela, com apoio supervisionado das ferramentas
   de IA previstas no planejamento.
4. Os testes saem direto dos critérios da especificação.

Mudar o comportamento do agente exige mudar antes a especificação
correspondente, no mesmo pull request.

Um arquivo por caso de uso, nomeado `UC<numero>-<nome>.md`.
