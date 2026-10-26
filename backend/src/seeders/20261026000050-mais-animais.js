'use strict';

const bcrypt = require('bcryptjs');

/**
 * Mais 50 animais para a demonstração: 30 disponíveis no catálogo e 20 que já
 * receberam pedido de adoção, cada um numa etapa do processo (Figura 8).
 *
 * Roda antes do seeder de fotos (o nome do arquivo decide a ordem), para que
 * as fotos em fotos/<arquivo>.webp já encontrem os animais criados.
 *
 * Tudo fictício: nomes, telefones e e-mails (@exemplo.com) são inventados.
 * Os status de animal e de pedido seguem as mesmas regras do sistema:
 * pedido aberto deixa o animal "Em processo de adoção", concluído deixa
 * "Adotado" e recusado devolve o animal para "Disponível".
 */

const ANIMAIS = [
  {
    "arquivo": "pingo",
    "nome": "Pingo",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "2 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Resgatado numa praça de Sumaré, onde vivia ganhando comida dos comerciantes. Esperto e curioso, aprende comandos rápido e adora passear na guia. Por ser pequeno, se adapta bem a apartamento."
  },
  {
    "arquivo": "caramelo",
    "nome": "Caramelo",
    "especie": "Canina",
    "raca": "Vira-lata caramelo",
    "idade": "3 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia, vermifugado.",
    "caracteristicas": "O clássico vira-lata caramelo: chegou de uma colônia de cães perto da rodovia. Leal, brincalhão e ótimo de guarda, avisa quando alguém chega mas é manso com a família. Precisa de quintal ou de passeios diários."
  },
  {
    "arquivo": "pacoca",
    "nome": "Paçoca",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "4 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Resgatada perto da rodoviária, onde esperava por alguém que nunca voltou. Calma, anda bem na guia e é carinhosa com todo mundo. Ideal para quem procura uma companheira tranquila."
  },
  {
    "arquivo": "biscoito",
    "nome": "Biscoito",
    "especie": "Canina",
    "raca": "Golden misto",
    "idade": "3 meses",
    "porte": "Médio",
    "condicaoSaude": "Primeira dose da polivalente aplicada.",
    "caracteristicas": "Filhote de uma ninhada resgatada de uma chácara abandonada. Dorminhoco e muito dócil, já atende pelo nome. Vai crescer bastante, então precisa de espaço quando for adulto."
  },
  {
    "arquivo": "chocolate",
    "nome": "Chocolate",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "5 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Viveu cinco anos num quintal sem contato com gente e chegou desconfiado. Com paciência, virou um cão apegado que segue o tutor pela casa. Foi adotado por uma família que tem tempo para ele."
  },
  {
    "arquivo": "ruiva",
    "nome": "Ruiva",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "2 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Encontrada correndo na beira da estrada, sem coleira e sem ninguém procurando. É cheia de energia, ideal para quem gosta de correr ou fazer trilha. Hoje vive num sítio com outros dois cães."
  },
  {
    "arquivo": "pretinha",
    "nome": "Pretinha",
    "especie": "Canina",
    "raca": "Labrador misto",
    "idade": "4 meses",
    "porte": "Grande",
    "condicaoSaude": "Duas doses da polivalente, vermifugada.",
    "caracteristicas": "Filhote de uma ninhada de labrador misto deixada na porta da ONG. Tranquila, adora colo e dorme abraçada em bichinho de pelúcia. Vai ficar grande e vai precisar de passeios todos os dias."
  },
  {
    "arquivo": "flecha",
    "nome": "Flecha",
    "especie": "Canina",
    "raca": "Galgo misto",
    "idade": "3 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Resgatado de um criador clandestino de corrida, magro e assustado. Na rua é rápido como o nome, mas em casa é um preguiçoso de sofá. Precisa correr todos os dias em lugar cercado."
  },
  {
    "arquivo": "amendoim",
    "nome": "Amendoim",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "5 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Primeiras vacinas aplicadas, vermifugado.",
    "caracteristicas": "Encontrado numa caixa de papelão na feira de domingo, junto com dois irmãos já adotados. Brincalhão e cheio de saúde, já faz as necessidades no jornal. Vai ficar de porte pequeno."
  },
  {
    "arquivo": "lobo",
    "nome": "Lobo",
    "especie": "Canina",
    "raca": "Pastor misto",
    "idade": "6 anos",
    "porte": "Grande",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Cão de guarda de uma empresa que fechou e deixou os animais para trás. Obediente e protetor, conhece comandos básicos. Precisa de quintal e de família com experiência em cães grandes."
  },
  {
    "arquivo": "canela",
    "nome": "Canela",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "4 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Vivia num posto de gasolina, onde os frentistas cuidavam dela como podiam. Gosta de deitar ao sol e de ter gente por perto. Convive bem com outros cães e com gatos calmos."
  },
  {
    "arquivo": "tupa",
    "nome": "Tupã",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "4 meses",
    "porte": "Médio",
    "condicaoSaude": "Primeira dose da polivalente, vermifugado.",
    "caracteristicas": "Filhote atento e corajoso, resgatado numa obra depois de uma chuva forte. Já faz xixi no jornal e senta quando pede petisco. Vai ficar de porte médio."
  },
  {
    "arquivo": "max",
    "nome": "Max",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "3 anos",
    "porte": "Grande",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Entregue à ONG por uma família que se mudou para um apartamento pequeno. Grandalhão gentil, adora crianças e brincar de buscar bolinha. Precisa de quintal e de passeios longos."
  },
  {
    "arquivo": "sol",
    "nome": "Sol",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "2 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Resgatada numa feira de adoção de outra cidade que fechou as portas. Alegre e sociável, faz amizade com qualquer pessoa ou cão no passeio. Ótima para família com crianças."
  },
  {
    "arquivo": "bento",
    "nome": "Bento",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "3 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Vivia preso num canil pequeno até ser recolhido por denúncia de vizinhos. Hoje vive de língua de fora e rolando na grama, e é ótimo com crianças. Já tem família esperando para levá-lo."
  },
  {
    "arquivo": "tico",
    "nome": "Tico",
    "especie": "Canina",
    "raca": "Pinscher misto",
    "idade": "4 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Ficou sozinho quando a tutora foi internada e não pôde mais cuidar dele. Pequeno no tamanho e grande na personalidade, late para avisar mas se acalma rápido. Bom para apartamento."
  },
  {
    "arquivo": "toddy",
    "nome": "Toddy",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "5 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Viveu sete anos com uma família que teve de devolvê-lo por alergia de um bebê. Sorridente e muito calmo, sabe ficar sozinho e não destrói nada. Combina com qualquer tipo de casa."
  },
  {
    "arquivo": "farofa",
    "nome": "Farofa",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "7 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, tratamento de pele concluído.",
    "caracteristicas": "Veterano das ruas, chegou com sarna e muito magro, e terminou o tratamento de pele na ONG. Tranquilo, só quer um canto quentinho e carinho. Perfeito para quem quer um cão sem agitação."
  },
  {
    "arquivo": "areia",
    "nome": "Areia",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "2 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Encontrada brincando na beira de um lago num parque da cidade, sem coleira. Ama água e passeio no parque, e precisa gastar energia todo dia. Ideal para família ativa."
  },
  {
    "arquivo": "soneca",
    "nome": "Soneca",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "6 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Morava na varanda de uma casa abandonada até ser resgatado por voluntários. Faz jus ao nome: dorme o dia todo e acorda para pedir carinho. Bom para quem passa muito tempo em casa."
  },
  {
    "arquivo": "zeca",
    "nome": "Zeca",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "11 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, dieta para rins, consulta a cada três meses.",
    "caracteristicas": "Perdeu o tutor aos 11 anos e passou a viver no portão da casa esperando. Idoso amoroso, segue dieta para os rins e vai ao veterinário a cada três meses. Procura um lar calmo para os anos que vêm."
  },
  {
    "arquivo": "pandora",
    "nome": "Pandora",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "3 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Primeira dose da polivalente.",
    "caracteristicas": "Filhote nascida na ONG, de uma mãe resgatada grávida. Curiosa, explora tudo e já sabe abrir a porta do armário. Vai precisar de paciência no adestramento."
  },
  {
    "arquivo": "bob",
    "nome": "Bob",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "4 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Resgatado amarrado num poste depois de uma mudança da família. Tem olhar expressivo e é muito obediente: senta, deita e dá a pata. Convive bem com crianças maiores."
  },
  {
    "arquivo": "boris",
    "nome": "Bóris",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "9 anos",
    "porte": "Grande",
    "condicaoSaude": "Castrado, controle de peso.",
    "caracteristicas": "Viveu nove anos numa padaria, onde comia mais do que devia. Gordinho bonachão, faz dieta de controle de peso e ama um cochilo. Ideal para família tranquila."
  },
  {
    "arquivo": "duquesa",
    "nome": "Duquesa",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "5 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Resgatada de uma casa com acúmulo de animais, onde vivia com mais de vinte cães. Elegante e reservada, prefere ser o único cão da casa. Com gente, é carinhosa e educada."
  },
  {
    "arquivo": "cafe",
    "nome": "Café",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "6 meses",
    "porte": "Médio",
    "condicaoSaude": "Vacinação de filhote completa, vermifugado.",
    "caracteristicas": "Filhote ligado no 220, encontrado no estacionamento de um supermercado. Já tomou todas as vacinas de filhote e aprende rápido. Perfeito para família ativa que goste de brincar."
  },
  {
    "arquivo": "urso",
    "nome": "Urso",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "4 anos",
    "porte": "Grande",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Resgatado de um terreno baldio, onde vivia com outros três cães. Grande, peludo e manso, adora carinho atrás da orelha. Precisa de espaço e de escovação semanal."
  },
  {
    "arquivo": "rocky",
    "nome": "Rocky",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "3 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Cuidava sozinho de uma oficina fechada até ser resgatado. Atento e companheiro, é bom cão de guarda mas carinhoso com a família. Já tem família aprovada para levá-lo."
  },
  {
    "arquivo": "fofa",
    "nome": "Fofa",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "6 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Entregue por uma senhora que não podia mais cuidar dela. Tem pelagem macia e jeito dócil, e convive bem com gatos. Ideal para casa com outros animais."
  },
  {
    "arquivo": "manchinha",
    "nome": "Manchinha",
    "especie": "Canina",
    "raca": "Mestiço",
    "idade": "2 anos",
    "porte": "Médio",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Encontrado num campo de futebol de várzea, correndo atrás da bola. Brincalhão e esperto, adora correr no gramado. Precisa de espaço e de brincadeiras diárias."
  },
  {
    "arquivo": "nuvem",
    "nome": "Nuvem",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "3 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Primeira dose da V4, vermifugada.",
    "caracteristicas": "Filhote encontrada dentro de um vaso de planta numa varanda. Tem pelo fofo cinza, é tranquila e adora colo. Já usa a caixa de areia."
  },
  {
    "arquivo": "tieta",
    "nome": "Tieta",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "3 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Tricolor que vivia num estacionamento e escolhia sempre o capô mais quente. Independente, gosta de observar tudo do alto. Ideal para casa com prateleiras e telas."
  },
  {
    "arquivo": "tigrao",
    "nome": "Tigrão",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "4 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia, FIV e FeLV negativos.",
    "caracteristicas": "Rajado de olhos verdes, resgatado de um telhado depois de três dias miando. Curioso e conversador, responde quando chamam. Tem exames de FIV e FeLV negativos."
  },
  {
    "arquivo": "pitoco",
    "nome": "Pitoco",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "5 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Vacinas de filhote completas.",
    "caracteristicas": "Filhote de uma colônia de gatos de uma escola, recolhido com os irmãos nas férias. Brincalhão, corre atrás de qualquer barbante. Já tomou as vacinas de filhote."
  },
  {
    "arquivo": "pluma",
    "nome": "Pluma",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "6 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Entregue por uma família que se mudou para o exterior. Tem pelagem longa e cinza, é calma e gosta de colo no fim do dia. Precisa de escovação duas vezes por semana."
  },
  {
    "arquivo": "bigode",
    "nome": "Bigode",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "2 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia, FIV e FeLV negativos.",
    "caracteristicas": "Apareceu numa padaria e logo virou o mascote dos clientes. Sociável, recebe as visitas na porta e adora conversa. Tem exames de FIV e FeLV negativos."
  },
  {
    "arquivo": "laranjinha",
    "nome": "Laranjinha",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "2 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Vermifugado, primeira vacina em breve.",
    "caracteristicas": "Filhote achado miando dentro de um bueiro, resgatado pelos bombeiros. Falante, mia pedindo atenção e brincadeira. Vai precisar de casa com telas."
  },
  {
    "arquivo": "pipa",
    "nome": "Pipa",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "3 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Primeira dose da V4.",
    "caracteristicas": "Filhote espiã, vive escondida observando a casa antes de se aproximar. Foi resgatada de um forro com a mãe e os irmãos. Ganha confiança rápido com petisco."
  },
  {
    "arquivo": "flor",
    "nome": "Flor",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "5 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Tricolor tranquila resgatada da rua depois de ser atropelada, já totalmente recuperada. Adora deitar nas folhas do quintal e tomar sol. Convive bem com outro gato calmo."
  },
  {
    "arquivo": "zeus",
    "nome": "Zeus",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "3 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Rajado elegante que vivia num condomínio e foi recolhido quando o síndico proibiu a alimentação. Independente, é ótimo para quem passa o dia fora. Gosta de brinquedos de varinha."
  },
  {
    "arquivo": "frajola",
    "nome": "Frajola",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "4 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Preto e branco de olhos amarelos, nascido numa colônia de um parque. Caçador oficial de mosquitos, é ágil e brincalhão. Precisa de casa com telas."
  },
  {
    "arquivo": "mimi",
    "nome": "Mimi",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "7 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Viveu sete anos com uma senhora que faleceu, e chegou à ONG muito triste. Já voltou a comer e a pedir carinho. Procura um lar silencioso, sem crianças pequenas."
  },
  {
    "arquivo": "domino",
    "nome": "Dominó",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "2 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Resgatado com o irmão numa caixa deixada na calçada; o irmão já foi adotado. Brincalhão e carinhoso, se dá bem com outros gatos. Já tem família aprovada."
  },
  {
    "arquivo": "kiwi",
    "nome": "Kiwi",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "1 ano",
    "porte": "Pequeno",
    "condicaoSaude": "Castrada, vacinas em dia.",
    "caracteristicas": "Jovem aventureira resgatada no alto de uma árvore. Adora explorar e escalar, por isso precisa de casa com telas e arranhador alto. É castrada e vacinada."
  },
  {
    "arquivo": "duque",
    "nome": "Duque",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "5 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia, escovação semanal.",
    "caracteristicas": "Entregue por uma família que não conseguia mais cuidar do pelo longo dele. Tem pose de nobre e é muito dócil. Precisa de escovação semanal e gosta de ser penteado."
  },
  {
    "arquivo": "pessego",
    "nome": "Pêssego",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "3 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Primeira dose da V4, vermifugado.",
    "caracteristicas": "Filhote de olhos azuis, resgatada com a ninhada num galpão. Adora dormir enroladinha em coberta. Já está vermifugada e tomou a primeira vacina."
  },
  {
    "arquivo": "oreo",
    "nome": "Oreo",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "6 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Vivia no telhado de uma oficina, onde descia só para comer. Tranquilo, adora uma coberta e um cantinho no sol. Já foi adotado e dominou o sofá da casa nova."
  },
  {
    "arquivo": "bolota",
    "nome": "Bolota",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "2 meses",
    "porte": "Pequeno",
    "condicaoSaude": "Vermifugada.",
    "caracteristicas": "Filhote da mesma ninhada da Pêssego, a mais corajosa dos irmãos. Curiosa, é a primeira a chegar quando alguém abre a porta. Vai precisar de casa com telas."
  },
  {
    "arquivo": "tobias",
    "nome": "Tobias",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "8 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, dieta leve.",
    "caracteristicas": "Morava com um casal que se mudou e o deixou para trás no apartamento. Gordinho dorminhoco, ama o sofá e segue uma dieta leve. Já foi adotado por uma família tranquila."
  },
  {
    "arquivo": "theo",
    "nome": "Theo",
    "especie": "Felina",
    "raca": "Mestiço",
    "idade": "5 anos",
    "porte": "Pequeno",
    "condicaoSaude": "Castrado, vacinas em dia.",
    "caracteristicas": "Gato de oficina, acostumado com gente, barulho e coleira. Muito companheiro, segue o tutor pela casa. Ideal para quem quer um gato sociável."
  }
];

const PEDIDOS = [
  {
    "animal": "pacoca",
    "status": "Pendente",
    "adotante": "lucas",
    "diasAtras": 1,
    "moradia": "Casa com quintal",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Fins de semana",
    "observacoes": ""
  },
  {
    "animal": "lobo",
    "status": "Pendente",
    "adotante": "juliana",
    "diasAtras": 2,
    "moradia": "Chácara",
    "outrosAnimais": "Um cão adulto",
    "disponibilidade": "Manhãs",
    "observacoes": ""
  },
  {
    "animal": "tigrao",
    "status": "Pendente",
    "adotante": "pedro",
    "diasAtras": 2,
    "moradia": "Apartamento com telas",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Noites",
    "observacoes": ""
  },
  {
    "animal": "canela",
    "status": "Pendente",
    "adotante": "camila",
    "diasAtras": 3,
    "moradia": "Casa com quintal",
    "outrosAnimais": "Uma gata",
    "disponibilidade": "Tardes",
    "observacoes": ""
  },
  {
    "animal": "nuvem",
    "status": "Pendente",
    "adotante": "rafael",
    "diasAtras": 1,
    "moradia": "Apartamento com telas",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Noites e fins de semana",
    "observacoes": ""
  },
  {
    "animal": "max",
    "status": "Em análise",
    "adotante": "beatriz",
    "diasAtras": 6,
    "moradia": "Casa com quintal grande",
    "outrosAnimais": "Dois cães",
    "disponibilidade": "Manhãs",
    "observacoes": ""
  },
  {
    "animal": "toddy",
    "status": "Em análise",
    "adotante": "gabriel",
    "diasAtras": 5,
    "moradia": "Casa",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Fins de semana",
    "observacoes": ""
  },
  {
    "animal": "flor",
    "status": "Em análise",
    "adotante": "larissa",
    "diasAtras": 7,
    "moradia": "Apartamento com telas",
    "outrosAnimais": "Um gato",
    "disponibilidade": "Noites",
    "observacoes": ""
  },
  {
    "animal": "zeca",
    "status": "Em análise",
    "adotante": "thiago",
    "diasAtras": 4,
    "moradia": "Casa térrea",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "O dia todo (trabalho em casa)",
    "observacoes": "Quer um cão idoso. Confirmar se consegue levar às consultas a cada três meses."
  },
  {
    "animal": "frajola",
    "status": "Em análise",
    "adotante": "fernanda",
    "diasAtras": 6,
    "moradia": "Apartamento com telas",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Noites",
    "observacoes": ""
  },
  {
    "animal": "bento",
    "status": "Aprovada",
    "adotante": "bruno",
    "diasAtras": 10,
    "moradia": "Casa com quintal",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Fins de semana",
    "observacoes": "Entrevista feita. Entrega marcada para sábado."
  },
  {
    "animal": "pluma",
    "status": "Aprovada",
    "adotante": "aline",
    "diasAtras": 9,
    "moradia": "Apartamento com telas",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Noites",
    "observacoes": "Visita feita, telas conferidas."
  },
  {
    "animal": "rocky",
    "status": "Aprovada",
    "adotante": "marcos",
    "diasAtras": 12,
    "moradia": "Casa com muro alto",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Manhãs",
    "observacoes": "Entrevista feita. Aguardando a data de entrega."
  },
  {
    "animal": "domino",
    "status": "Aprovada",
    "adotante": "patricia",
    "diasAtras": 8,
    "moradia": "Casa com telas",
    "outrosAnimais": "Um gato",
    "disponibilidade": "Tardes",
    "observacoes": "Visita feita. Apresentação aos poucos ao gato da casa."
  },
  {
    "animal": "chocolate",
    "status": "Concluída",
    "adotante": "diego",
    "diasAtras": 30,
    "moradia": "Casa com quintal",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Fins de semana",
    "observacoes": "Entregue com carteirinha e ração para a primeira semana."
  },
  {
    "animal": "ruiva",
    "status": "Concluída",
    "adotante": "vanessa",
    "diasAtras": 25,
    "moradia": "Sítio",
    "outrosAnimais": "Dois cães",
    "disponibilidade": "Manhãs",
    "observacoes": "Entregue. Primeira visita de acompanhamento marcada para daqui a 30 dias."
  },
  {
    "animal": "oreo",
    "status": "Concluída",
    "adotante": "lucas",
    "diasAtras": 40,
    "moradia": "Casa com telas",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Noites",
    "observacoes": "Entregue. Tutor mandou foto: já dominou o sofá."
  },
  {
    "animal": "tobias",
    "status": "Concluída",
    "adotante": "juliana",
    "diasAtras": 35,
    "moradia": "Apartamento com telas",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "O dia todo",
    "observacoes": "Entregue com a dieta indicada pelo veterinário."
  },
  {
    "animal": "flecha",
    "status": "Recusada",
    "adotante": "pedro",
    "diasAtras": 15,
    "moradia": "Apartamento sem área externa",
    "outrosAnimais": "Nenhum",
    "disponibilidade": "Fins de semana",
    "observacoes": "Ele precisa correr todos os dias e a rotina descrita não comporta. Sugerimos animais de perfil mais calmo."
  },
  {
    "animal": "duquesa",
    "status": "Recusada",
    "adotante": "camila",
    "diasAtras": 14,
    "moradia": "Casa com quintal",
    "outrosAnimais": "Três cães",
    "disponibilidade": "Tardes",
    "observacoes": "A Duquesa não convive bem com outros cães e a casa já tem três. Ficamos à disposição para indicar outro animal."
  }
];

const ADOTANTES = [
  {
    "chave": "lucas",
    "nome": "Lucas Ferreira",
    "telefone": "(19) 99101-0001",
    "info": "Casa com telas e quintal."
  },
  {
    "chave": "juliana",
    "nome": "Juliana Rocha",
    "telefone": "(19) 99101-0002",
    "info": "Chácara em Monte Mor."
  },
  {
    "chave": "pedro",
    "nome": "Pedro Henrique Lima",
    "telefone": "(19) 99101-0003",
    "info": "Apartamento com telas."
  },
  {
    "chave": "camila",
    "nome": "Camila Duarte",
    "telefone": "(19) 99101-0004",
    "info": "Casa com quintal."
  },
  {
    "chave": "rafael",
    "nome": "Rafael Nunes",
    "telefone": "(19) 99101-0005",
    "info": "Apartamento com telas."
  },
  {
    "chave": "beatriz",
    "nome": "Beatriz Moraes",
    "telefone": "(19) 99101-0006",
    "info": "Casa com quintal grande."
  },
  {
    "chave": "gabriel",
    "nome": "Gabriel Costa",
    "telefone": "(19) 99101-0007",
    "info": "Casa."
  },
  {
    "chave": "larissa",
    "nome": "Larissa Melo",
    "telefone": "(19) 99101-0008",
    "info": "Apartamento com telas."
  },
  {
    "chave": "thiago",
    "nome": "Thiago Ribeiro",
    "telefone": "(19) 99101-0009",
    "info": "Casa térrea, trabalho em casa."
  },
  {
    "chave": "fernanda",
    "nome": "Fernanda Gomes",
    "telefone": "(19) 99101-0010",
    "info": "Apartamento com telas."
  },
  {
    "chave": "bruno",
    "nome": "Bruno Teixeira",
    "telefone": "(19) 99101-0011",
    "info": "Casa com quintal."
  },
  {
    "chave": "aline",
    "nome": "Aline Barbosa",
    "telefone": "(19) 99101-0012",
    "info": "Apartamento com telas."
  },
  {
    "chave": "marcos",
    "nome": "Marcos Vieira",
    "telefone": "(19) 99101-0013",
    "info": "Casa com muro alto."
  },
  {
    "chave": "patricia",
    "nome": "Patrícia Lopes",
    "telefone": "(19) 99101-0014",
    "info": "Casa com telas."
  },
  {
    "chave": "diego",
    "nome": "Diego Martins",
    "telefone": "(19) 99101-0015",
    "info": "Casa com quintal."
  },
  {
    "chave": "vanessa",
    "nome": "Vanessa Cardoso",
    "telefone": "(19) 99101-0016",
    "info": "Sítio em Sumaré."
  }
];

const CONVERSAS = [
  {
    "animal": "pacoca",
    "mensagens": [
      {
        "de": "adotante",
        "texto": "Oi! Vi a Paçoca no site e me apaixonei. Ela se dá bem com crianças?"
      },
      {
        "de": "ong",
        "texto": "Oi, Lucas! Se dá muito bem, sim. Vamos analisar seu pedido e te chamamos para conversar."
      }
    ]
  },
  {
    "animal": "max",
    "mensagens": [
      {
        "de": "ong",
        "texto": "Oi, Beatriz! O Max é grande e brincalhão. Seus dois cães são castrados?"
      },
      {
        "de": "adotante",
        "texto": "São sim, os dois. E o quintal é todo murado."
      }
    ]
  },
  {
    "animal": "zeca",
    "mensagens": [
      {
        "de": "ong",
        "texto": "Thiago, o Zeca toma ração para rins e vai ao veterinário a cada três meses. Tudo bem para você?"
      },
      {
        "de": "adotante",
        "texto": "Tudo bem. Trabalho em casa, então consigo levar nas consultas."
      }
    ]
  },
  {
    "animal": "flor",
    "mensagens": [
      {
        "de": "adotante",
        "texto": "Meu gato é bem tranquilo. Como seria a apresentação dos dois?"
      },
      {
        "de": "ong",
        "texto": "Aos poucos, em cômodos separados nos primeiros dias. Te mandamos um guia na entrevista."
      }
    ]
  },
  {
    "animal": "bento",
    "mensagens": [
      {
        "de": "ong",
        "texto": "Bruno, entrevista aprovada! Podemos fazer a entrega no sábado às 10h?"
      },
      {
        "de": "adotante",
        "texto": "Perfeito, estarei lá. Já comprei a caminha!"
      }
    ]
  },
  {
    "animal": "rocky",
    "mensagens": [
      {
        "de": "ong",
        "texto": "Marcos, deu tudo certo na entrevista. Qual o melhor dia para buscar o Rocky?"
      },
      {
        "de": "adotante",
        "texto": "Pode ser na quarta à tarde?"
      }
    ]
  },
  {
    "animal": "ruiva",
    "mensagens": [
      {
        "de": "ong",
        "texto": "Vanessa, como a Ruiva está se adaptando?"
      },
      {
        "de": "adotante",
        "texto": "Super bem! Já corre com os outros dois pelo sítio."
      }
    ]
  },
  {
    "animal": "oreo",
    "mensagens": [
      {
        "de": "adotante",
        "texto": "O Oreo já dominou o sofá, obrigado por tudo!"
      },
      {
        "de": "ong",
        "texto": "Que alegria! Qualquer dúvida é só chamar."
      }
    ]
  }
];

const ETAPA = { 'Pendente': 1, 'Em análise': 2, 'Aprovada': 3, 'Concluída': 4, 'Recusada': 4 };
const STATUS_DO_ANIMAL = {
  'Pendente': 'Em processo de adoção',
  'Em análise': 'Em processo de adoção',
  'Aprovada': 'Em processo de adoção',
  'Concluída': 'Adotado',
  'Recusada': 'Disponível',
};

const diasAtras = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const email = (chave) => `${chave}@exemplo.com`;

module.exports = {
  async up(queryInterface) {
    const agora = new Date();
    const t = { created_at: agora, updated_at: agora };
    const [[ong]] = await queryInterface.sequelize.query('SELECT id FROM ong ORDER BY id LIMIT 1');
    const [[equipe]] = await queryInterface.sequelize.query(
      "SELECT id FROM usuario WHERE email = 'leticia@amigosdepatas.org'"
    );
    const senha = await bcrypt.hash('connectpatas', 10);

    // ---- adotantes
    const usuarios = await queryInterface.bulkInsert('usuario', ADOTANTES.map((a) => ({
      nome: a.nome, email: email(a.chave), senha_hash: senha,
      tipo_usuario: 'adotante', ativo: true, ...t,
    })), { returning: ['id'] });
    const idAdotante = {};
    ADOTANTES.forEach((a, i) => { idAdotante[a.chave] = usuarios[i].id; });
    await queryInterface.bulkInsert('adotante', ADOTANTES.map((a) => ({
      id_usuario: idAdotante[a.chave], telefone: a.telefone, info_adocao: a.info, ...t,
    })));

    // ---- animais, já com o status que o pedido deles exige
    const pedidoDo = Object.fromEntries(PEDIDOS.map((p) => [p.animal, p]));
    const criados = await queryInterface.bulkInsert('animal', ANIMAIS.map((a) => ({
      id_ong: ong.id, nome: a.nome, especie: a.especie, raca: a.raca, idade: a.idade,
      porte: a.porte, condicao_saude: a.condicaoSaude, caracteristicas: a.caracteristicas,
      status: pedidoDo[a.arquivo] ? STATUS_DO_ANIMAL[pedidoDo[a.arquivo].status] : 'Disponível',
      ...t,
    })), { returning: ['id'] });
    const idAnimal = {};
    ANIMAIS.forEach((a, i) => { idAnimal[a.arquivo] = criados[i].id; });

    // ---- pedidos de adoção
    const telefone = Object.fromEntries(ADOTANTES.map((a) => [a.chave, a.telefone]));
    const pedidos = await queryInterface.bulkInsert('solicitacao_adocao', PEDIDOS.map((p) => ({
      id_animal: idAnimal[p.animal], id_adotante: idAdotante[p.adotante],
      data_solicitacao: diasAtras(p.diasAtras), status: p.status, etapa: ETAPA[p.status],
      telefone_contato: telefone[p.adotante], moradia: p.moradia,
      outros_animais: p.outrosAnimais, disponibilidade: p.disponibilidade,
      observacoes: p.observacoes, ...t,
    })), { returning: ['id'] });
    const idPedido = {};
    PEDIDOS.forEach((p, i) => { idPedido[p.animal] = { id: pedidos[i].id, adotante: idAdotante[p.adotante] }; });

    // ---- conversas dentro dos pedidos (UC08)
    const mensagens = [];
    CONVERSAS.forEach((c) => {
      const { id, adotante } = idPedido[c.animal];
      c.mensagens.forEach((m, i) => {
        const daOng = m.de === 'ong';
        const quando = new Date(agora.getTime() - (c.mensagens.length - i) * 3600 * 1000);
        mensagens.push({
          id_solicitacao: id,
          id_remetente: daOng ? equipe.id : adotante,
          id_destinatario: daOng ? adotante : equipe.id,
          conteudo: m.texto, data_envio: quando, ...t,
        });
      });
    });
    await queryInterface.bulkInsert('mensagem', mensagens);
  },

  async down(queryInterface) {
    const nomes = ANIMAIS.map((a) => a.nome);
    const emails = ADOTANTES.map((a) => email(a.chave));
    // Pedido primeiro (as mensagens saem junto, em cascata), depois animal e conta.
    await queryInterface.sequelize.query(
      `DELETE FROM solicitacao_adocao WHERE id_adotante IN
         (SELECT id FROM usuario WHERE email IN (:emails))`, { replacements: { emails } }
    );
    await queryInterface.sequelize.query(
      'DELETE FROM animal WHERE nome IN (:nomes)', { replacements: { nomes } }
    );
    await queryInterface.sequelize.query(
      `DELETE FROM adotante WHERE id_usuario IN
         (SELECT id FROM usuario WHERE email IN (:emails))`, { replacements: { emails } }
    );
    await queryInterface.sequelize.query(
      'DELETE FROM usuario WHERE email IN (:emails)', { replacements: { emails } }
    );
  },
};
