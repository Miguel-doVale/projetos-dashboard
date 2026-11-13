-- Conteúdo inicial migrado de LASETE_Levantamento_Projetos.html.
-- Rodar uma única vez, depois do esquema (0001). O e-mail do Miguel Vale fica nulo: preencher depois.
begin;

insert into public.people (name, role, area, email, access) values
  ('Miguel Vale', 'Diretor', 'Projetos', null, 'owner'),
  ('Nicolas Mesquita', null, null, null, 'none'),
  ('Pedro Brasil', null, null, null, 'none'),
  ('Gheorghe Marighella', null, null, null, 'none'),
  ('Matheus Aguiar', null, null, null, 'none');

insert into public.projects (position, number, title, kind, status_level, status_label, summary, deadline, facts, sections) values
  (1, '01', 'Site institucional da LASETE', 'projeto', 'on', 'Em andamento', 'Organizar e desenvolver a presença institucional da LASETE.', 'A definir',
    '[{"label":"Relevância","value":"1º · maior prioridade"},{"label":"Prazo","value":"A definir"}]'::jsonb,
    '[{"title":"Escopo informado","blocks":[{"type":"list","items":["Reunir e organizar fotos e textos.","Solicitar fotografias sem uso de celular (confirmar se o pedido é por fotos profissionais/câmera).","Apresentar o ideal, a cultura e a história da LASETE."]}]},{"title":"Ideias a avaliar","blocks":[{"type":"list","items":["Linha do tempo das equipes, com textos explicativos da trajetória da liga.","Futuro, não obrigatório agora: página de parceiros (LASEG e, possivelmente, LARP), após validação."]}]},{"title":"Dependência","full":true,"blocks":[{"type":"list","items":["Diretoria de Comunicação: cartão “Produzir novas fotos para o site e imagens dos cards da LASETE”."]}]}]'::jsonb),
  (2, '02', 'Mapa da UNDB e aluguel de sala', 'projeto', 'half', 'Fase inicial · homologação', 'Projeto de mapa para a UNDB e aluguel de sala.', null,
    '[{"label":"Relevância","value":"2º"},{"label":"Próximo marco","value":"Reunião do projeto (confirmar data)"}]'::jsonb,
    '[{"title":"Escopo a esclarecer","blocks":[{"type":"list","items":["Finalidade do mapa.","Quais espaços e ambientes serão representados.","Como o aluguel/reserva de sala se relaciona com o mapa."]}]},{"title":"Sugestão de pauta para a reunião","blocks":[{"type":"list","items":["Objetivo e público do mapa.","Relação mapa × reserva de sala.","Quem homologa pela UNDB.","Equipe, primeira entrega e data."]}]}]'::jsonb),
  (3, '03', 'Dashboard interno da liga', 'projeto', 'off', 'A entrar', 'Criar um web app interno que concentre a organização da LASETE, para a liga não depender mais de Notion ou Trello.', 'A definir',
    '[{"label":"Relevância","value":"3º"},{"label":"Prazo","value":"A definir"}]'::jsonb,
    '[{"title":"Escopo sugerido · primeira versão","blocks":[{"type":"list","items":["Login dos membros, com permissões por diretoria e cargo.","Projetos e tarefas em quadro (o que hoje está no Trello): status, responsáveis, prazos e checklists.","Membros e diretorias: quem é quem e quem está em quê.","Visão geral: painel com o andamento de cada diretoria."]}]},{"title":"Depois da primeira versão","blocks":[{"type":"list","items":["Reuniões e atas (o que hoje ficaria no Notion).","Calendário de eventos, aulas e CTFs.","Documentos e links da liga.","Migração do conteúdo do Trello e do Notion."]}]},{"title":"Escopo a esclarecer","blocks":[{"type":"list","items":["O que exatamente a liga usa hoje no Notion e no Trello e precisa existir no app.","Quem acessa: só diretoria ou todos os ligantes.","Onde hospeda e quem mantém depois de pronto.","Stack e equipe de desenvolvimento."]}]},{"title":"Riscos","blocks":[{"type":"list","items":["Escopo: refazer Notion e Trello inteiros é grande demais. A primeira versão precisa substituir um uso só, e bem.","Adoção: se o app for pior que o Trello no dia a dia, a liga volta para o Trello.","Segurança: dados de membros numa liga de cibersegurança pedem autenticação e controle de acesso bem feitos desde o início.","Concorre por tempo com o site, que é a prioridade 1."]}]}]'::jsonb),
  (4, '04', 'Máscara da LASETE', 'projeto', 'off', 'Proposta em elaboração', 'Produzir uma máscara física no formato da logo da liga, passando por modelagem 3D, impressão, acabamento e pintura.', 'A definir',
    '[{"label":"Relevância","value":"4º · menor prioridade"},{"label":"Prazo","value":"A definir"}]'::jsonb,
    '[{"title":"Proposta do diretor","full":true,"blocks":[{"type":"text","text":"A peça funciona como objeto-símbolo da LASETE: carrega a marca e pode ser exposta em eventos, feiras e na sala, mostrando na prática a capacidade de execução, o esforço e os interesses da liga."}]},{"full":true,"blocks":[{"type":"table","headers":["Etapa","Como","Recurso"],"rows":[["1 · Modelagem","Modelo 3D a partir da logo, em software de modelagem","Membro com experiência em modelagem (a definir)"],["2 · Impressão","Impressora 3D da Software House","Filamento preto ou branco, custeado pela liga"],["3 · Acabamento e pintura","Lixamento, preparação e pintura","Tinta custeada pela liga"],["4 · Exposição","Uso em eventos e materiais da liga","—"]]}]},{"title":"Pontos em aberto","blocks":[{"type":"list","items":["Orçamento: quantidade e preço do filamento e da tinta.","Autorização e agenda da impressora da Software House.","Quem modela, em qual software e o tamanho final da peça.","Cor do filamento e esquema de pintura."]}]}]'::jsonb),
  (5, '+', 'Organizar CTFs internos', 'colaboracao', 'off', 'A definir', 'Realizar edições internas de CTF para os ligantes, organizadas em conjunto pelas diretorias de Ensino e de Projetos.', null,
    '[{"label":"Diretorias","value":"Ensino e Projetos"},{"label":"Periodicidade","value":"Semestral ou anual (a definir)"}]'::jsonb,
    '[{"title":"A definir","blocks":[{"type":"list","items":["Periodicidade: uma edição por semestre ou por ano.","Formato, plataforma e desafios.","Responsáveis de cada diretoria e o papel de Projetos (plataforma, infraestrutura, desafios)."]}]},{"title":"Relacionado no quadro","full":true,"blocks":[{"type":"list","items":["[Extensão] Organizar Batalha das Ligas em formato CTF: a plataforma e os desafios podem ser reaproveitados."]}]}]'::jsonb),
  (6, 'G1', 'Cyberdeck da LASETE', 'gadget', 'off', 'A definir', 'Montar um cyberdeck da liga: um computador portátil de construção própria, voltado a segurança, para usar em CTFs, aulas e demonstrações.', 'A definir',
    '[{"label":"Linha","value":"Gadgets"},{"label":"Prazo","value":"A definir"}]'::jsonb,
    '[{"blocks":[{"type":"text","text":"Linha da Diretoria de Projetos voltada à construção de hardware de segurança pela própria liga, para estudo, CTFs, aulas e demonstrações. No momento, tem um item."}]},{"title":"Escopo sugerido","blocks":[{"type":"list","items":["Placa compacta (Raspberry Pi ou similar) com uma distribuição Linux voltada a segurança.","Tela, teclado compacto e bateria, para funcionar sem tomada.","Case modelado e impresso em 3D na impressora da Software House.","Espaço para módulos: adaptador Wi-Fi, rádio (SDR) e portas extras."]}]},{"title":"A definir","blocks":[{"type":"list","items":["Finalidade principal: CTFs, aulas, demonstrações ou pesquisa.","Lista de componentes e orçamento, e de onde sai o custo.","Quem fica à frente e quem participa.","Regras de uso: onde fica guardado e uso só em ambientes autorizados."]}]},{"title":"Conexões com outros projetos","blocks":[{"type":"list","items":["Máscara: mesma etapa de modelagem e impressão 3D.","CTFs internos: equipamento para as edições.","Ensino: a documentação da montagem vira material de aula."]}]}]'::jsonb);

insert into public.project_members (project_id, person_id, is_lead)
select p.id, pe.id, v.is_lead
from (values
  ('01', 'Miguel Vale', true),
  ('02', 'Nicolas Mesquita', true),
  ('04', 'Pedro Brasil', true),
  ('+', 'Gheorghe Marighella', false),
  ('+', 'Matheus Aguiar', false)
) as v(number, person, is_lead)
join public.projects p on p.number = v.number
join public.people pe on pe.name = v.person;

insert into public.tasks (project_id, title, description, status, position)
select p.id, v.title, v.description, v.status::public.task_status, v.position
from (values
  ('01', 'Reunir e organizar as fotos existentes e solicitar novas (confirmar requisito de não usar celular)', null, 'todo', 0),
  ('01', 'Reunir e revisar os textos institucionais: ideal, cultura e história', null, 'todo', 1),
  ('01', 'Planejar estrutura e conteúdo das páginas', null, 'todo', 2),
  ('01', 'Criar linha do tempo das equipes com textos explicativos', null, 'todo', 3),
  ('01', 'Alinhar necessidades de imagens com a Comunicação', null, 'todo', 4),
  ('01', 'Avaliar futuramente página de parceiros (LASEG e possível LARP)', null, 'todo', 5),
  ('02', 'Definir objetivo e público do mapa da UNDB', null, 'todo', 0),
  ('02', 'Esclarecer relação do mapa com aluguel/reserva de sala', null, 'todo', 1),
  ('02', 'Levantar requisitos e informações dos ambientes', null, 'todo', 2),
  ('02', 'Definir entregáveis, responsáveis e cronograma', null, 'todo', 3),
  ('03', 'Definir quem fica à frente e a equipe', null, 'todo', 0),
  ('03', 'Levantar o que a liga usa hoje no Trello e no Notion', null, 'todo', 1),
  ('03', 'Fechar o escopo da primeira versão', null, 'todo', 2),
  ('03', 'Escolher stack, hospedagem e modelo de permissões', null, 'todo', 3),
  ('03', 'Criar o cartão do projeto no Trello', null, 'todo', 4),
  ('04', 'Definir propósito e formato da máscara', 'Coberto pela proposta: física, impressa em 3D', 'done', 0),
  ('04', 'Elaborar conceito e proposta inicial', 'Rascunho acima, falta validar', 'todo', 1),
  ('04', 'Definir materiais, responsáveis e orçamento', null, 'todo', 2),
  ('04', 'Validar proposta e planejar execução', null, 'todo', 3),
  ('+', 'Decidir periodicidade', null, 'todo', 0),
  ('+', 'Definir plataforma e desafios', null, 'todo', 1),
  ('+', 'Testar e divulgar edição', null, 'todo', 2),
  ('G1', 'Definir finalidade e requisitos', null, 'todo', 0),
  ('G1', 'Levantar componentes e orçamento', null, 'todo', 1),
  ('G1', 'Modelar e imprimir o case', null, 'todo', 2),
  ('G1', 'Montar e testar o protótipo', null, 'todo', 3),
  ('G1', 'Documentar a montagem', null, 'todo', 4)
) as v(number, title, description, status, position)
join public.projects p on p.number = v.number;

insert into public.pages (position, slug, title, blocks) values
  (1, 'plano', 'Plano de atividades', '[{"blocks":[{"type":"text","text":"Os quatro projetos da diretoria seguem a ordem definida pelo diretor. Os CTFs internos (colaboração com a Diretoria de Ensino) e a linha de Gadgets ficam fora do ranking até a diretoria decidir onde encaixam."}]},{"title":"Plano de atividades da diretoria","blocks":[{"type":"text","text":"Em andamento"},{"type":"text","text":"Objetivo: estabelecer os projetos, ações e entregas da diretoria."},{"type":"text","text":"Próximo passo: identificar prioridades, responsáveis, prazos e possíveis colaborações."},{"type":"checklist","items":[{"text":"Definir prioridades da diretoria","done":true,"note":"Feito neste levantamento"},{"text":"Escolher projetos e entregas","done":true,"note":"4 projetos + 1 colaboração; entregas do dashboard ainda em sugestão"},{"text":"Definir responsáveis e prazos","note":"Parcial: falta a frente do dashboard; nenhum prazo"}]}]}]'::jsonb),
  (2, 'pendencias', 'Pendências', '[{"title":"Pendências de decisão","blocks":[{"type":"decisions","items":[{"label":"Dashboard","text":"quem fica à frente e qual é o escopo da primeira versão."},{"label":"Prazos","text":"nenhum projeto tem data."},{"label":"CTFs","text":"periodicidade e o papel de Projetos na parceria com Ensino."},{"label":"Cyberdeck","text":"finalidade, orçamento e quem fica à frente."},{"label":"Site","text":"confirmar o requisito das fotos “sem celular” e alinhar com a Comunicação."},{"label":"Mapa","text":"finalidade, ambientes e relação com a reserva de sala."},{"label":"Máscara","text":"validar a proposta e levantar o orçamento."},{"label":"Equipes","text":"além da frente, quem participa de cada projeto."}]}]},{"title":"Próximos passos","blocks":[{"type":"checklist","items":[{"text":"Realizar a reunião do mapa e registrar as decisões"},{"text":"Definir a frente do dashboard"},{"text":"Alinhar os CTFs internos com a Diretoria de Ensino"},{"text":"Definir finalidade e orçamento do cyberdeck"},{"text":"Atualizar os cartões no Trello (lista, membros, datas)"},{"text":"Definir um prazo ou marco para cada projeto"},{"text":"Levar a proposta da máscara para validação"}]}]}]'::jsonb);

commit;
