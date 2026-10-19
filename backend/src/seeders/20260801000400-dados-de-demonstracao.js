'use strict';

const bcrypt = require('bcryptjs');

/**
 * Massa de dados fictícia, igual à do protótipo navegável.
 * Nenhum dado real de ONG ou de adotante — Seção 9.3 do documento.
 *
 * Os status de animal e de solicitação são mantidos coerentes entre si:
 * animal "Em processo de adoção" tem solicitação aberta, animal "Adotado"
 * tem solicitação concluída. Incoerência aqui vira bug na demonstração.
 */
const hoje = new Date();
const data = (diasAtras) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
};
const agora = () => new Date();

module.exports = {
  async up(queryInterface) {
    const senha = await bcrypt.hash('connectpatas', 10);
    const t = { created_at: agora(), updated_at: agora() };

    const [ong] = await queryInterface.bulkInsert('ong', [{
      nome: 'Amigos de Patas',
      cnpj: '00.000.000/0001-00',
      descricao: 'ONG de Hortolândia que acolhe cães e gatos resgatados desde 2019.',
      contato: '(19) 99999-0000',
      endereco: 'Rua das Acácias, 120 — Centro',
      cidade: 'Hortolândia/SP',
      ...t,
    }], { returning: ['id'] });
    const idOng = ong.id;

    const usuarios = await queryInterface.bulkInsert('usuario', [
      { nome: 'Letícia Capovila', email: 'leticia@amigosdepatas.org',
        senha_hash: senha, tipo_usuario: 'responsavel_ong', ativo: true, ...t },
      { nome: 'Luri Serdan', email: 'luri@amigosdepatas.org',
        senha_hash: senha, tipo_usuario: 'voluntario_ong', ativo: true, ...t },
      { nome: 'Maria Souza', email: 'maria@exemplo.com',
        senha_hash: senha, tipo_usuario: 'adotante', ativo: true, ...t },
      { nome: 'João Prado', email: 'joao@exemplo.com',
        senha_hash: senha, tipo_usuario: 'adotante', ativo: true, ...t },
      { nome: 'Ana Beatriz', email: 'ana@exemplo.com',
        senha_hash: senha, tipo_usuario: 'adotante', ativo: true, ...t },
      { nome: 'Carlos Dias', email: 'carlos@exemplo.com',
        senha_hash: senha, tipo_usuario: 'adotante', ativo: true, ...t },
      { nome: 'Rita Alves', email: 'rita@exemplo.com',
        senha_hash: senha, tipo_usuario: 'adotante', ativo: true, ...t },
    ], { returning: ['id'] });

    const [leticia, luri, maria, joao, ana, carlos, rita] = usuarios.map((u) => u.id);

    await queryInterface.bulkInsert('responsavel_ong',
      [{ id_usuario: leticia, id_ong: idOng, ...t }]);
    await queryInterface.bulkInsert('voluntario_ong',
      [{ id_usuario: luri, id_ong: idOng, ...t }]);
    await queryInterface.bulkInsert('adotante', [
      { id_usuario: maria, telefone: '(19) 98888-1111',
        info_adocao: 'Casa com quintal cercado. Tem uma gata adulta.', ...t },
      { id_usuario: joao, telefone: '(19) 97777-2222',
        info_adocao: 'Apartamento com telas.', ...t },
      { id_usuario: ana, telefone: '(19) 96666-3333',
        info_adocao: 'Casa com quintal. Dois cães.', ...t },
      { id_usuario: carlos, telefone: '(19) 95555-4444', info_adocao: 'Casa.', ...t },
      { id_usuario: rita, telefone: '(19) 94444-5555',
        info_adocao: 'Casa térrea com quintal.', ...t },
    ]);

    const animais = await queryInterface.bulkInsert('animal', [
      { id_ong: idOng, nome: 'Rex', especie: 'Canina', raca: 'Sem raça definida',
        idade: '3 anos', porte: 'Médio',
        condicao_saude: 'Castrado, vacinas em dia (V10 e antirrábica), vermifugado em agosto.',
        caracteristicas: 'Resgatado de uma rua movimentada no centro, em março. Dócil, '
          + 'convive bem com outros cães e já passeia com guia.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Mel', especie: 'Felina', raca: 'SRD', idade: '1 ano',
        porte: 'Pequeno', condicao_saude: 'Castrada, V4 e antirrábica aplicadas.',
        caracteristicas: 'Chegou filhote com a ninhada. Brincalhona, se dá bem com crianças.',
        status: 'Em processo de adoção', ...t },
      { id_ong: idOng, nome: 'Thor', especie: 'Canina', raca: 'Pastor misto',
        idade: '5 anos', porte: 'Grande',
        condicao_saude: 'Castrado, tratamento de dermatite concluído em julho.',
        caracteristicas: 'Calmo e obediente. Precisa de espaço e de família com experiência.',
        status: 'Em processo de adoção', ...t },
      { id_ong: idOng, nome: 'Nina', especie: 'Felina', raca: 'SRD', idade: '2 anos',
        porte: 'Pequeno', condicao_saude: 'Castrada, vacinas em dia.',
        caracteristicas: 'Tímida no começo, muito afetuosa depois que confia.',
        status: 'Adotado', ...t },
      { id_ong: idOng, nome: 'Bidu', especie: 'Canina', raca: 'SRD', idade: '7 meses',
        porte: 'Pequeno',
        condicao_saude: 'Primeira dose da polivalente aplicada, castração agendada.',
        caracteristicas: 'Filhote cheio de energia. Vai precisar de paciência no adestramento.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Luna', especie: 'Felina', raca: 'SRD', idade: '4 anos',
        porte: 'Médio', condicao_saude: 'Castrada, FIV e FeLV negativos.',
        caracteristicas: 'Independente e tranquila. Prefere casas sem outros gatos.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Pipoca', especie: 'Canina', raca: 'SRD', idade: '2 anos',
        porte: 'Médio', condicao_saude: 'Castrada, vacinas em dia.',
        caracteristicas: 'Muito sociável, adora criança. Já vivia em casa antes do abandono.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Fred', especie: 'Canina', raca: 'Labrador misto',
        idade: '6 anos', porte: 'Grande',
        condicao_saude: 'Castrado, acompanhamento de articulação a cada seis meses.',
        caracteristicas: 'Idoso tranquilo, companheiro de sofá. Procura lar definitivo.',
        status: 'Em processo de adoção', ...t },
    ], { returning: ['id'] });

    const [rex, mel, thor, nina, , , , fred] = animais.map((a) => a.id);

    const solicitacoes = await queryInterface.bulkInsert('solicitacao_adocao', [
      { id_animal: mel, id_adotante: joao, data_solicitacao: data(8), status: 'Aprovada',
        etapa: 3, telefone_contato: '(19) 97777-2222', moradia: 'Apartamento com telas',
        outros_animais: 'Nenhum', disponibilidade: 'Noites', observacoes: '', ...t },
      { id_animal: thor, id_adotante: ana, data_solicitacao: data(9), status: 'Em análise',
        etapa: 2, telefone_contato: '(19) 96666-3333', moradia: 'Casa com quintal',
        outros_animais: 'Dois cães', disponibilidade: 'Manhãs', observacoes: '', ...t },
      { id_animal: nina, id_adotante: carlos, data_solicitacao: data(10), status: 'Concluída',
        etapa: 4, telefone_contato: '(19) 95555-4444', moradia: 'Casa',
        outros_animais: 'Nenhum', disponibilidade: 'Fins de semana', observacoes: '', ...t },
      { id_animal: fred, id_adotante: rita, data_solicitacao: data(11), status: 'Em análise',
        etapa: 2, telefone_contato: '(19) 94444-5555', moradia: 'Casa térrea com quintal',
        outros_animais: 'Nenhum', disponibilidade: 'Manhãs e fins de semana',
        observacoes: 'Interessada em animal idoso. Confirmar rotina de medicação.', ...t },
    ], { returning: ['id'] });

    const solFred = solicitacoes[3].id;
    await queryInterface.bulkInsert('mensagem', [
      { id_solicitacao: solFred, id_remetente: leticia, id_destinatario: rita,
        conteudo: 'Oi Rita! Recebemos sua solicitação para o Fred. Ele precisa de '
          + 'acompanhamento de articulação a cada seis meses — tudo bem para você?',
        data_envio: agora(), ...t },
      { id_solicitacao: solFred, id_remetente: rita, id_destinatario: leticia,
        conteudo: 'Tudo bem sim. Posso levar no veterinário nas datas certas.',
        data_envio: agora(), ...t },
    ]);

    await queryInterface.bulkInsert('item_conhecimento', [
      { id_ong: idOng, titulo: 'Calendário de vacinação anual — cães', categoria: 'Vacinação',
        conteudo: 'Para cães adultos o calendário da ONG prevê o reforço anual da polivalente '
          + '(V8 ou V10) e o da antirrábica. A vermifugação costuma ser repetida a cada seis '
          + 'meses, mas o intervalo muda conforme a idade e a rotina do animal. As datas exatas '
          + 'ficam na carteirinha e são ajustadas pelo veterinário a cada consulta.',
        termos: 'vacina vacinas vacinação anual reforço polivalente antirrábica raiva '
          + 'carteirinha cachorro cão cães',
        fonte: 'Protocolo interno da ONG, revisado com a clínica parceira',
        validado_por: 'Dra. Helena Prado', validado_em: data(23), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Calendário de vacinação — gatos', categoria: 'Vacinação',
        conteudo: 'Gatos adultos recebem reforço anual da polivalente felina (V3, V4 ou V5, '
          + 'conforme a indicação) e da antirrábica. Gatos com acesso à rua costumam precisar '
          + 'de proteção adicional, avaliada caso a caso pelo veterinário.',
        termos: 'vacina vacinas vacinação gato gata gatos felino antirrábica raiva',
        fonte: 'Protocolo interno da ONG, revisado com a clínica parceira',
        validado_por: 'Dra. Helena Prado', validado_em: data(23), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Sinais de alerta que pedem veterinário', categoria: 'Saúde',
        conteudo: 'Procure atendimento veterinário quando o animal apresentar vômito ou '
          + 'diarreia por mais de um dia, recusa de comida por mais de 24 horas, apatia fora '
          + 'do normal, dificuldade para respirar, sangramento, convulsão ou dor aparente. '
          + 'Sinais que persistem por dias, mesmo leves, também merecem avaliação.',
        termos: 'sinais alerta saúde doente sintoma vômito diarreia sangue convulsão apatia '
          + 'febre olho vermelho ferida não come apetite respiração cachorro cão gato',
        fonte: 'Material de orientação da clínica parceira',
        validado_por: 'Dra. Helena Prado', validado_em: data(23), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Alimentação por faixa etária', categoria: 'Alimentação',
        conteudo: 'Filhotes comem porções menores várias vezes ao dia; adultos costumam ficar '
          + 'bem com duas refeições. A quantidade depende do peso, do porte e do nível de '
          + 'atividade, e vem indicada na embalagem da ração. Mudanças de alimento são feitas '
          + 'aos poucos, ao longo de uma semana, para evitar desarranjo intestinal.',
        termos: 'alimentação ração comida comer filhote adulto idoso porção quantidade petisco '
          + 'osso cachorro cão gato',
        fonte: 'Orientação da clínica parceira',
        validado_por: 'Dra. Helena Prado', validado_em: data(30), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Adaptação nos primeiros 15 dias', categoria: 'Comportamento',
        conteudo: 'Nos primeiros dias o animal costuma se esconder, comer pouco e dormir '
          + 'muito. Ofereça um canto tranquilo, mantenha horários fixos de comida e passeio e '
          + 'evite visitas em excesso. A maior parte dos animais se solta entre o sétimo e o '
          + 'décimo quinto dia.',
        termos: 'adaptação chegada primeiros dias medo escondido estresse rotina casa novo lar '
          + 'comportamento cachorro cão gato',
        fonte: 'Experiência acumulada dos voluntários da ONG',
        validado_por: 'Letícia Capovila', validado_em: data(33), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Custos médios de manutenção', categoria: 'Adoção',
        conteudo: 'Os gastos recorrentes são ração, vermífugo, antipulgas e a consulta anual '
          + 'com as vacinas. Cães de porte grande consomem mais ração que os pequenos, e '
          + 'animais idosos costumam exigir consultas mais frequentes. Vale reservar uma '
          + 'quantia para imprevistos de saúde antes de adotar.',
        termos: 'custo custos gasto preço dinheiro mensal quanto custa manter ração '
          + 'veterinário cachorro cão gato',
        fonte: 'Levantamento da ONG com tutores em 2026',
        validado_por: 'Luri Serdan', validado_em: data(38), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Convivência com crianças e outros animais',
        categoria: 'Comportamento',
        conteudo: 'A apresentação entre animais é feita aos poucos, em ambiente neutro e com '
          + 'supervisão, ao longo de alguns dias. Com crianças, vale combinar antes regras '
          + 'simples: não incomodar o animal comendo nem dormindo. Cada ficha de animal indica '
          + 'se ele já conviveu com crianças ou com outros bichos.',
        termos: 'criança crianças filhos outro animal outros animais apresentar apresentação '
          + 'convivência ciúme',
        fonte: 'Experiência acumulada dos voluntários da ONG',
        validado_por: 'Letícia Capovila', validado_em: data(33), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Alimentos proibidos para cães e gatos',
        categoria: 'Alimentação',
        conteudo: 'Chocolate, cebola, alho, uva e uva-passa, abacate, adoçante xilitol, café e '
          + 'bebida alcoólica são tóxicos para cães e gatos, e alguns causam intoxicação grave '
          + 'em quantidade pequena. Osso cozido também fica fora: lasca e perfura o intestino. '
          + 'Se o animal comeu qualquer um deles, procure o veterinário na hora, mesmo que ele '
          + 'pareça bem.',
        termos: 'chocolate cebola alho uva passas abacate xilitol adoçante café álcool cerveja '
          + 'osso cozido proibido proibidos tóxico tóxicos venenoso pode comer dar comida '
          + 'humana intoxicação envenenamento',
        fonte: 'Orientação da clínica parceira',
        validado_por: 'Dra. Helena Prado', validado_em: data(20), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Vermifugação — versão antiga', categoria: 'Saúde',
        conteudo: 'Conteúdo substituído pelo item de calendário de vacinação e cuidados '
          + 'periódicos.',
        termos: 'vermífugo vermifugação',
        fonte: 'Protocolo substituído em julho',
        validado_por: 'Dra. Helena Prado', validado_em: data(83), ativo: false, ...t },
    ]);
  },

  async down(queryInterface) {
    // Ordem inversa das dependências.
    for (const tabela of ['mensagem_ia', 'conversa_ia', 'item_conhecimento', 'mensagem',
      'solicitacao_adocao', 'animal', 'adotante', 'voluntario_ong', 'responsavel_ong',
      'usuario', 'ong']) {
      await queryInterface.bulkDelete(tabela, null, {});
    }
  },
};
