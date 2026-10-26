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
      { id_ong: idOng, nome: 'Rex', especie: 'Canina', raca: 'Mestiço',
        idade: '3 anos', porte: 'Médio',
        condicao_saude: 'Castrado, vacinas em dia (V10 e antirrábica), vermifugado em agosto.',
        caracteristicas: 'Resgatado de uma rua movimentada do centro em março, ainda magrinho e '
          + 'com medo de carro. Hoje é dócil, convive bem com outros cães e já '
          + 'passeia na guia sem puxar. Combina com família que goste de caminhar no '
          + 'fim da tarde.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Mel', especie: 'Felina', raca: 'Mestiço', idade: '1 ano',
        porte: 'Pequeno', condicao_saude: 'Castrada, V4 e antirrábica aplicadas.',
        caracteristicas: 'Chegou filhote junto com a ninhada, encontrada numa caixa na porta de um '
          + 'mercado. Cresceu brincalhona e paciente, e se dá muito bem com crianças. '
          + 'Adora caçar bolinha de papel e dormir no colo.',
        status: 'Em processo de adoção', ...t },
      { id_ong: idOng, nome: 'Thor', especie: 'Canina', raca: 'Pastor misto',
        idade: '5 anos', porte: 'Grande',
        condicao_saude: 'Castrado, tratamento de dermatite concluído em julho.',
        caracteristicas: 'Viveu anos preso numa corrente curta até ser denunciado e resgatado. '
          + 'Mesmo assim é calmo, obediente e atento aos comandos. Precisa de espaço '
          + 'para gastar energia e de uma família com experiência em cães grandes.',
        status: 'Em processo de adoção', ...t },
      { id_ong: idOng, nome: 'Nina', especie: 'Felina', raca: 'Mestiço', idade: '2 anos',
        porte: 'Pequeno', condicao_saude: 'Castrada, vacinas em dia.',
        caracteristicas: 'Foi encontrada escondida num motor de carro durante uma chuva forte. '
          + 'Tímida nos primeiros dias, vira uma gata muito afetuosa depois que '
          + 'confia. Gosta de casas calmas e de janela com sol.',
        status: 'Adotado', ...t },
      { id_ong: idOng, nome: 'Bidu', especie: 'Canina', raca: 'Mestiço', idade: '7 meses',
        porte: 'Pequeno',
        condicao_saude: 'Primeira dose da polivalente aplicada, castração agendada.',
        caracteristicas: 'Apareceu sozinho num terreno baldio com cerca de dois meses. É um '
          + 'filhote cheio de energia, curioso e muito esperto. Vai precisar de '
          + 'paciência no adestramento e de bastante brincadeira para gastar a '
          + 'bateria.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Luna', especie: 'Felina', raca: 'Mestiço', idade: '4 anos',
        porte: 'Médio', condicao_saude: 'Castrada, FIV e FeLV negativos.',
        caracteristicas: 'Viveu na rua por anos até chegar à ONG, por isso é independente e sabe o '
          + 'que quer. Tranquila e limpinha, usa a caixa de areia direitinho. Prefere '
          + 'ser a única gata da casa.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Pipoca', especie: 'Canina', raca: 'Mestiço', idade: '2 anos',
        porte: 'Médio', condicao_saude: 'Castrada, vacinas em dia.',
        caracteristicas: 'Foi abandonada amarrada no portão de uma casa vazia. Já vivia em família '
          + 'antes e sabe se comportar dentro de casa. Muito sociável, adora criança '
          + 'e faz festa para qualquer visita.',
        status: 'Disponível', ...t },
      { id_ong: idOng, nome: 'Fred', especie: 'Canina', raca: 'Labrador misto',
        idade: '6 anos', porte: 'Grande',
        condicao_saude: 'Castrado, acompanhamento de articulação a cada seis meses.',
        caracteristicas: 'Ficou sem lar quando o tutor idoso foi morar com a família em outra '
          + 'cidade. Tranquilo e companheiro de sofá, faz acompanhamento de '
          + 'articulação a cada seis meses. Procura um lar definitivo para os anos '
          + 'que ainda tem pela frente.',
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
      // ---- Itens ampliados em outubro de 2026. O conteúdo segue fontes públicas,
      // citadas no campo "fonte"; numa ONG real, cada um passa pela revisão do
      // veterinário parceiro antes de ser ativado.
      { id_ong: idOng, titulo: 'Castração', categoria: 'Saúde',
        conteudo: 'A castração é uma cirurgia com anestesia geral que evita crias indesejadas '
          + 'e reduz o risco de câncer de mama nas fêmeas e de problemas de próstata nos '
          + 'machos. Também diminui fugas, brigas e marcação de território ligadas ao cio, sem '
          + 'mudar a personalidade do animal. Costuma ser feita por volta dos cinco meses, '
          + 'depois das primeiras vacinas, e a recuperação leva cerca de uma semana, com os '
          + 'pontos retirados por volta do sétimo dia. A data certa é definida pelo veterinário.',
        termos: 'castração castrar castrado castrada cirurgia cio esterilização crias filhotes '
          + 'indesejados câncer mama próstata marcar território fuga idade quando',
        fonte: 'UFPel — Em Pauta, "A importância da castração" (entrevista com o médico-veterinário Paulo Paim)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Leishmaniose e o mosquito-palha', categoria: 'Saúde',
        conteudo: 'A leishmaniose visceral é transmitida pela picada do mosquito-palha, que se '
          + 'cria em matéria orgânica no solo, e pode atingir cães e pessoas. No cão, os sinais '
          + 'incluem perda de pelo em volta do focinho, das orelhas e dos olhos, emagrecimento '
          + 'mesmo comendo, apatia, vômito e diarreia. A prevenção combina coleira com '
          + 'repelente e inseticida, quintal sem folhas e restos acumulados e, quando indicada '
          + 'pelo veterinário, a vacina. Remédio de gente não serve para o animal.',
        termos: 'leishmaniose calazar mosquito palha mosquito-palha coleira repelente '
          + 'emagrecimento queda pelo focinho orelha prevenção',
        fonte: 'CFMV — Comissão Nacional de Saúde Pública Veterinária, via Agência Brasil (2020)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Carrapatos e a doença do carrapato', categoria: 'Saúde',
        conteudo: 'A doença do carrapato (erliquiose) é causada por uma bactéria passada pela '
          + 'picada do carrapato-marrom e pode causar febre, falta de apetite, apatia, '
          + 'manchas vermelhas na pele e sangramento pelo nariz ou pela gengiva. Para prevenir, '
          + 'use o antipulgas e carrapaticida indicado pelo veterinário, confira o corpo do '
          + 'animal depois dos passeios e limpe caminhas, tapetes e quintal.',
        termos: 'carrapato carrapatos doença do carrapato erliquiose antipulgas carrapaticida '
          + 'pulga pulgas coleira pipeta parasita parasitas cão cachorro',
        fonte: 'Petlove, "Erliquiose canina: a doença do carrapato" — conferir com o veterinário',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Plantas perigosas: o lírio e os gatos', categoria: 'Saúde',
        conteudo: 'O lírio é muito perigoso para gatos: um pedaço pequeno de folha, flor ou até '
          + 'o pólen pode causar insuficiência nos rins. Os primeiros sinais aparecem em poucas '
          + 'horas, com vômito, salivação e falta de apetite. Quem tem gato não deve ter lírio '
          + 'em casa. Se o gato mastigou a planta, vá ao veterinário na hora: quanto antes o '
          + 'tratamento começa, maior a chance de recuperação.',
        termos: 'planta plantas lírio lirio flor flores vaso jardim tóxica tóxico venenosa '
          + 'veneno rim rins gato gatos',
        fonte: 'UFPel e UFRGS, "Intoxicação por lírio em felino" (Anais do SIIEPE, 2017)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Passeio no calor', categoria: 'Saúde',
        conteudo: 'Em dias quentes, passeie de manhã cedo ou no fim da tarde: o CRMV-SP '
          + 'recomenda evitar o horário das 10h às 16h. Antes de sair, encoste a mão no '
          + 'asfalto; se estiver quente para você, queima a pata do cão. Leve água e prefira '
          + 'sombra e grama. Raças de focinho curto, idosos e animais acima do peso sofrem '
          + 'mais. Nunca deixe o animal dentro do carro, nem com a janela aberta.',
        termos: 'calor quente verão sol asfalto pata queimadura passeio passear horário água '
          + 'hidratação insolação carro',
        fonte: 'CRMV-SP, via Correio Braziliense (setembro de 2026)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Medo de fogos e trovões', categoria: 'Comportamento',
        conteudo: 'Tremor, respiração acelerada, salivação e vontade de fugir são sinais de '
          + 'medo. Feche portas, portões e janelas para evitar fuga, deixe o animal ficar no '
          + 'esconderijo que ele escolher e use música baixa, TV ou ventilador para abafar o '
          + 'barulho. Com o tempo, dá para acostumar o animal tocando o som bem baixo junto '
          + 'com carinho e petisco. Calmante só com receita do veterinário.',
        termos: 'fogos fogos de artifício rojão trovão trovões tempestade barulho medo '
          + 'assustado tremendo réveillon festa junina',
        fonte: 'Médica-veterinária Dilane Costa, via TNH1',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'RG animal: cadastro no SinPatinhas', categoria: 'Adoção',
        conteudo: 'O SinPatinhas é o cadastro nacional de cães e gatos do governo federal, '
          + 'gratuito e opcional. Pelo site gov.br, com a conta gov.br do tutor, o animal ganha '
          + 'um número de RG Animal válido em todo o país e um QR Code para a coleira, que '
          + 'ajuda a achar o tutor se o animal se perder. O cadastro pede dados como sexo, se é '
          + 'castrado, se tem microchip e onde mora.',
        termos: 'rg pet pets registro cadastro sinpatinhas documento identificação coleira qr code '
          + 'microchip perdido perdeu sumiu gov.br',
        fonte: 'CNN Brasil, "RG dos pets: como fazer e para que serve" (2025)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Guarda responsável e a lei', categoria: 'Adoção',
        conteudo: 'Adotar é assumir o animal pela vida inteira dele, que pode passar de 15 '
          + 'anos. Abandono e maus-tratos são crime pela Lei de Crimes Ambientais, e a Lei '
          + '14.064/2020 aumentou a pena quando a vítima é cão ou gato: reclusão de dois a '
          + 'cinco anos, multa e proibição de ter a guarda de animais. Se a adoção não der '
          + 'certo, a ONG pede que o animal seja devolvido a ela, nunca deixado na rua.',
        termos: 'lei leis crime abandono abandonar maus-tratos maus tratos responsabilidade '
          + 'guarda responsável devolver devolução desistir',
        fonte: 'Lei nº 14.064/2020 e Lei nº 9.605/1998 (planalto.gov.br)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Como funciona a adoção pelo ConnectPatas', categoria: 'Adoção',
        conteudo: 'Escolha o animal no catálogo, entre na sua conta e preencha o pedido com '
          + 'informações sobre moradia, outros animais e disponibilidade. O pedido passa por '
          + 'análise do perfil, entrevista ou visita e, se aprovado, a adoção é concluída com a '
          + 'entrega do animal. Você acompanha cada etapa em Minhas solicitações e conversa com '
          + 'a ONG ali mesmo. Se o pedido for recusado, a ONG explica o motivo.',
        termos: 'como adotar adoção processo etapas etapa pedido solicitação solicitar '
          + 'entrevista visita aprovado aprovação recusado prazo demora andamento',
        fonte: 'Regras do processo de adoção do ConnectPatas',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Caixa de areia do gato', categoria: 'Comportamento',
        conteudo: 'Deixe a caixa de areia num canto calmo, longe da comida e da água. Tire as '
          + 'fezes todos os dias e troque a areia toda com frequência, porque o gato evita '
          + 'caixa suja. Com mais de um gato, o costume é ter uma caixa por gato e mais uma. '
          + 'Se ele passar a fazer fora da caixa de repente, pode ser sinal de problema de '
          + 'saúde e vale levar ao veterinário.',
        termos: 'caixa areia caixa de areia xixi cocô fezes urina banheiro fora do lugar '
          + 'gato gatos gatinho',
        fonte: 'Orientação geral de cuidados (conteúdo de demonstração)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Telas de proteção para gatos', categoria: 'Saúde',
        conteudo: 'Gatos sobem em janelas e sacadas e se distraem com pássaros e insetos, e '
          + 'quedas são uma causa comum de acidentes graves. Antes de levar um gato para '
          + 'casa ou apartamento, instale telas de proteção em janelas, sacadas e áreas de '
          + 'serviço. Muitas ONGs pedem as telas como condição para a adoção de gatos.',
        termos: 'tela telas janela janelas sacada varanda apartamento prédio queda cair '
          + 'proteção gato gatos',
        fonte: 'Orientação geral de cuidados (conteúdo de demonstração)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
      { id_ong: idOng, titulo: 'Cuidados com o animal idoso', categoria: 'Saúde',
        conteudo: 'Cães e gatos idosos costumam precisar de consultas mais frequentes, ração '
          + 'própria para a idade e atenção a dentes, articulações e peso. Caminhas macias, '
          + 'tapetes antiderrapantes e passeios mais curtos ajudam no dia a dia. Adotar um '
          + 'animal idoso também é uma ótima escolha: ele já tem o temperamento formado e '
          + 'costuma ser mais calmo.',
        termos: 'idoso idosa velho velhinho velhinha senior sênior terceira idade '
          + 'articulação artrose adotar idoso',
        fonte: 'Orientação geral de cuidados (conteúdo de demonstração)',
        validado_por: 'Equipe ConnectPatas', validado_em: data(6), ativo: true, ...t },
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
