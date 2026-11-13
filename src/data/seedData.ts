// Gerado por scripts/seed-to-ts.mjs a partir de supabase/seed.sql. Referências por chave:
// membros e tarefas apontam o projeto pelo `number` e a pessoa pelo `name`; nada tem id.
import type { Page, Person, Project, ProjectMember, Task } from '@/lib/types'

type Free<T> = Omit<T, 'id' | 'created_at'>

export interface SeedData {
  people: Free<Person>[]
  projects: Free<Project>[]
  members: (Omit<Free<ProjectMember>, 'project_id' | 'person_id'> & { project: string; person: string })[]
  tasks: (Omit<Free<Task>, 'project_id' | 'assignee_id' | 'sprint_id' | 'due_on'> & { project: string })[]
  pages: Free<Page>[]
}

export const seedData: SeedData = {
  "people": [
    {
      "name": "Miguel Vale",
      "role": "Diretor",
      "area": "Projetos",
      "email": null,
      "uid": null
    },
    {
      "name": "Nicolas Mesquita",
      "role": null,
      "area": null,
      "email": null,
      "uid": null
    },
    {
      "name": "Pedro Brasil",
      "role": null,
      "area": null,
      "email": null,
      "uid": null
    },
    {
      "name": "Gheorghe Marighella",
      "role": null,
      "area": null,
      "email": null,
      "uid": null
    },
    {
      "name": "Matheus Aguiar",
      "role": null,
      "area": null,
      "email": null,
      "uid": null
    }
  ],
  "projects": [
    {
      "position": 1,
      "number": "01",
      "title": "Site institucional da LASETE",
      "kind": "projeto",
      "status_level": "on",
      "status_label": "Em andamento",
      "summary": "Organizar e desenvolver a presença institucional da LASETE.",
      "deadline": null,
      "facts": [
        {
          "label": "Relevância",
          "value": "1º · maior prioridade"
        },
        {
          "label": "Prazo",
          "value": "A definir"
        }
      ],
      "sections": [
        {
          "title": "Escopo informado",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Reunir e organizar fotos e textos.",
                "Solicitar fotografias sem uso de celular (confirmar se o pedido é por fotos profissionais/câmera).",
                "Apresentar o ideal, a cultura e a história da LASETE."
              ]
            }
          ]
        },
        {
          "title": "Ideias a avaliar",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Linha do tempo das equipes, com textos explicativos da trajetória da liga.",
                "Futuro, não obrigatório agora: página de parceiros (LASEG e, possivelmente, LARP), após validação."
              ]
            }
          ]
        },
        {
          "title": "Dependência",
          "full": true,
          "blocks": [
            {
              "type": "list",
              "items": [
                "Diretoria de Comunicação: cartão “Produzir novas fotos para o site e imagens dos cards da LASETE”."
              ]
            }
          ]
        }
      ]
    },
    {
      "position": 2,
      "number": "02",
      "title": "Mapa da UNDB e aluguel de sala",
      "kind": "projeto",
      "status_level": "half",
      "status_label": "Fase inicial · homologação",
      "summary": "Projeto de mapa para a UNDB e aluguel de sala.",
      "deadline": null,
      "facts": [
        {
          "label": "Relevância",
          "value": "2º"
        },
        {
          "label": "Próximo marco",
          "value": "Reunião do projeto (confirmar data)"
        }
      ],
      "sections": [
        {
          "title": "Escopo a esclarecer",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Finalidade do mapa.",
                "Quais espaços e ambientes serão representados.",
                "Como o aluguel/reserva de sala se relaciona com o mapa."
              ]
            }
          ]
        },
        {
          "title": "Sugestão de pauta para a reunião",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Objetivo e público do mapa.",
                "Relação mapa × reserva de sala.",
                "Quem homologa pela UNDB.",
                "Equipe, primeira entrega e data."
              ]
            }
          ]
        }
      ]
    },
    {
      "position": 3,
      "number": "03",
      "title": "Dashboard interno da liga",
      "kind": "projeto",
      "status_level": "off",
      "status_label": "A entrar",
      "summary": "Criar um web app interno que concentre a organização da LASETE, para a liga não depender mais de Notion ou Trello.",
      "deadline": null,
      "facts": [
        {
          "label": "Relevância",
          "value": "3º"
        },
        {
          "label": "Prazo",
          "value": "A definir"
        }
      ],
      "sections": [
        {
          "title": "Escopo sugerido · primeira versão",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Login dos membros, com permissões por diretoria e cargo.",
                "Projetos e tarefas em quadro (o que hoje está no Trello): status, responsáveis, prazos e checklists.",
                "Membros e diretorias: quem é quem e quem está em quê.",
                "Visão geral: painel com o andamento de cada diretoria."
              ]
            }
          ]
        },
        {
          "title": "Depois da primeira versão",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Reuniões e atas (o que hoje ficaria no Notion).",
                "Calendário de eventos, aulas e CTFs.",
                "Documentos e links da liga.",
                "Migração do conteúdo do Trello e do Notion."
              ]
            }
          ]
        },
        {
          "title": "Escopo a esclarecer",
          "blocks": [
            {
              "type": "list",
              "items": [
                "O que exatamente a liga usa hoje no Notion e no Trello e precisa existir no app.",
                "Quem acessa: só diretoria ou todos os ligantes.",
                "Onde hospeda e quem mantém depois de pronto.",
                "Stack e equipe de desenvolvimento."
              ]
            }
          ]
        },
        {
          "title": "Riscos",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Escopo: refazer Notion e Trello inteiros é grande demais. A primeira versão precisa substituir um uso só, e bem.",
                "Adoção: se o app for pior que o Trello no dia a dia, a liga volta para o Trello.",
                "Segurança: dados de membros numa liga de cibersegurança pedem autenticação e controle de acesso bem feitos desde o início.",
                "Concorre por tempo com o site, que é a prioridade 1."
              ]
            }
          ]
        }
      ]
    },
    {
      "position": 4,
      "number": "04",
      "title": "Máscara da LASETE",
      "kind": "projeto",
      "status_level": "off",
      "status_label": "Proposta em elaboração",
      "summary": "Produzir uma máscara física no formato da logo da liga, passando por modelagem 3D, impressão, acabamento e pintura.",
      "deadline": null,
      "facts": [
        {
          "label": "Relevância",
          "value": "4º · menor prioridade"
        },
        {
          "label": "Prazo",
          "value": "A definir"
        }
      ],
      "sections": [
        {
          "title": "Proposta do diretor",
          "full": true,
          "blocks": [
            {
              "type": "text",
              "text": "A peça funciona como objeto-símbolo da LASETE: carrega a marca e pode ser exposta em eventos, feiras e na sala, mostrando na prática a capacidade de execução, o esforço e os interesses da liga."
            }
          ]
        },
        {
          "full": true,
          "blocks": [
            {
              "type": "table",
              "headers": [
                "Etapa",
                "Como",
                "Recurso"
              ],
              "rows": [
                [
                  "1 · Modelagem",
                  "Modelo 3D a partir da logo, em software de modelagem",
                  "Membro com experiência em modelagem (a definir)"
                ],
                [
                  "2 · Impressão",
                  "Impressora 3D da Software House",
                  "Filamento preto ou branco, custeado pela liga"
                ],
                [
                  "3 · Acabamento e pintura",
                  "Lixamento, preparação e pintura",
                  "Tinta custeada pela liga"
                ],
                [
                  "4 · Exposição",
                  "Uso em eventos e materiais da liga",
                  "—"
                ]
              ]
            }
          ]
        },
        {
          "title": "Pontos em aberto",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Orçamento: quantidade e preço do filamento e da tinta.",
                "Autorização e agenda da impressora da Software House.",
                "Quem modela, em qual software e o tamanho final da peça.",
                "Cor do filamento e esquema de pintura."
              ]
            }
          ]
        }
      ]
    },
    {
      "position": 5,
      "number": "+",
      "title": "Organizar CTFs internos",
      "kind": "colaboracao",
      "status_level": "off",
      "status_label": "A definir",
      "summary": "Realizar edições internas de CTF para os ligantes, organizadas em conjunto pelas diretorias de Ensino e de Projetos.",
      "deadline": null,
      "facts": [
        {
          "label": "Diretorias",
          "value": "Ensino e Projetos"
        },
        {
          "label": "Periodicidade",
          "value": "Semestral ou anual (a definir)"
        }
      ],
      "sections": [
        {
          "title": "A definir",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Periodicidade: uma edição por semestre ou por ano.",
                "Formato, plataforma e desafios.",
                "Responsáveis de cada diretoria e o papel de Projetos (plataforma, infraestrutura, desafios)."
              ]
            }
          ]
        },
        {
          "title": "Relacionado no quadro",
          "full": true,
          "blocks": [
            {
              "type": "list",
              "items": [
                "[Extensão] Organizar Batalha das Ligas em formato CTF: a plataforma e os desafios podem ser reaproveitados."
              ]
            }
          ]
        }
      ]
    },
    {
      "position": 6,
      "number": "G1",
      "title": "Cyberdeck da LASETE",
      "kind": "gadget",
      "status_level": "off",
      "status_label": "A definir",
      "summary": "Montar um cyberdeck da liga: um computador portátil de construção própria, voltado a segurança, para usar em CTFs, aulas e demonstrações.",
      "deadline": null,
      "facts": [
        {
          "label": "Linha",
          "value": "Gadgets"
        },
        {
          "label": "Prazo",
          "value": "A definir"
        }
      ],
      "sections": [
        {
          "blocks": [
            {
              "type": "text",
              "text": "Linha da Diretoria de Projetos voltada à construção de hardware de segurança pela própria liga, para estudo, CTFs, aulas e demonstrações. No momento, tem um item."
            }
          ]
        },
        {
          "title": "Escopo sugerido",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Placa compacta (Raspberry Pi ou similar) com uma distribuição Linux voltada a segurança.",
                "Tela, teclado compacto e bateria, para funcionar sem tomada.",
                "Case modelado e impresso em 3D na impressora da Software House.",
                "Espaço para módulos: adaptador Wi-Fi, rádio (SDR) e portas extras."
              ]
            }
          ]
        },
        {
          "title": "A definir",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Finalidade principal: CTFs, aulas, demonstrações ou pesquisa.",
                "Lista de componentes e orçamento, e de onde sai o custo.",
                "Quem fica à frente e quem participa.",
                "Regras de uso: onde fica guardado e uso só em ambientes autorizados."
              ]
            }
          ]
        },
        {
          "title": "Conexões com outros projetos",
          "blocks": [
            {
              "type": "list",
              "items": [
                "Máscara: mesma etapa de modelagem e impressão 3D.",
                "CTFs internos: equipamento para as edições.",
                "Ensino: a documentação da montagem vira material de aula."
              ]
            }
          ]
        }
      ]
    }
  ],
  "members": [
    {
      "project": "01",
      "person": "Miguel Vale",
      "role": null,
      "is_lead": true
    },
    {
      "project": "02",
      "person": "Nicolas Mesquita",
      "role": null,
      "is_lead": true
    },
    {
      "project": "04",
      "person": "Pedro Brasil",
      "role": null,
      "is_lead": true
    },
    {
      "project": "+",
      "person": "Gheorghe Marighella",
      "role": null,
      "is_lead": false
    },
    {
      "project": "+",
      "person": "Matheus Aguiar",
      "role": null,
      "is_lead": false
    }
  ],
  "tasks": [
    {
      "project": "01",
      "title": "Reunir e organizar as fotos existentes e solicitar novas (confirmar requisito de não usar celular)",
      "description": null,
      "status": "todo",
      "position": 0
    },
    {
      "project": "01",
      "title": "Reunir e revisar os textos institucionais: ideal, cultura e história",
      "description": null,
      "status": "todo",
      "position": 1
    },
    {
      "project": "01",
      "title": "Planejar estrutura e conteúdo das páginas",
      "description": null,
      "status": "todo",
      "position": 2
    },
    {
      "project": "01",
      "title": "Criar linha do tempo das equipes com textos explicativos",
      "description": null,
      "status": "todo",
      "position": 3
    },
    {
      "project": "01",
      "title": "Alinhar necessidades de imagens com a Comunicação",
      "description": null,
      "status": "todo",
      "position": 4
    },
    {
      "project": "01",
      "title": "Avaliar futuramente página de parceiros (LASEG e possível LARP)",
      "description": null,
      "status": "todo",
      "position": 5
    },
    {
      "project": "02",
      "title": "Definir objetivo e público do mapa da UNDB",
      "description": null,
      "status": "todo",
      "position": 0
    },
    {
      "project": "02",
      "title": "Esclarecer relação do mapa com aluguel/reserva de sala",
      "description": null,
      "status": "todo",
      "position": 1
    },
    {
      "project": "02",
      "title": "Levantar requisitos e informações dos ambientes",
      "description": null,
      "status": "todo",
      "position": 2
    },
    {
      "project": "02",
      "title": "Definir entregáveis, responsáveis e cronograma",
      "description": null,
      "status": "todo",
      "position": 3
    },
    {
      "project": "03",
      "title": "Definir quem fica à frente e a equipe",
      "description": null,
      "status": "todo",
      "position": 0
    },
    {
      "project": "03",
      "title": "Levantar o que a liga usa hoje no Trello e no Notion",
      "description": null,
      "status": "todo",
      "position": 1
    },
    {
      "project": "03",
      "title": "Fechar o escopo da primeira versão",
      "description": null,
      "status": "todo",
      "position": 2
    },
    {
      "project": "03",
      "title": "Escolher stack, hospedagem e modelo de permissões",
      "description": null,
      "status": "todo",
      "position": 3
    },
    {
      "project": "03",
      "title": "Criar o cartão do projeto no Trello",
      "description": null,
      "status": "todo",
      "position": 4
    },
    {
      "project": "04",
      "title": "Definir propósito e formato da máscara",
      "description": "Coberto pela proposta: física, impressa em 3D",
      "status": "done",
      "position": 0
    },
    {
      "project": "04",
      "title": "Elaborar conceito e proposta inicial",
      "description": "Rascunho acima, falta validar",
      "status": "todo",
      "position": 1
    },
    {
      "project": "04",
      "title": "Definir materiais, responsáveis e orçamento",
      "description": null,
      "status": "todo",
      "position": 2
    },
    {
      "project": "04",
      "title": "Validar proposta e planejar execução",
      "description": null,
      "status": "todo",
      "position": 3
    },
    {
      "project": "+",
      "title": "Decidir periodicidade",
      "description": null,
      "status": "todo",
      "position": 0
    },
    {
      "project": "+",
      "title": "Definir plataforma e desafios",
      "description": null,
      "status": "todo",
      "position": 1
    },
    {
      "project": "+",
      "title": "Testar e divulgar edição",
      "description": null,
      "status": "todo",
      "position": 2
    },
    {
      "project": "G1",
      "title": "Definir finalidade e requisitos",
      "description": null,
      "status": "todo",
      "position": 0
    },
    {
      "project": "G1",
      "title": "Levantar componentes e orçamento",
      "description": null,
      "status": "todo",
      "position": 1
    },
    {
      "project": "G1",
      "title": "Modelar e imprimir o case",
      "description": null,
      "status": "todo",
      "position": 2
    },
    {
      "project": "G1",
      "title": "Montar e testar o protótipo",
      "description": null,
      "status": "todo",
      "position": 3
    },
    {
      "project": "G1",
      "title": "Documentar a montagem",
      "description": null,
      "status": "todo",
      "position": 4
    }
  ],
  "pages": [
    {
      "position": 1,
      "slug": "plano",
      "title": "Plano de atividades",
      "blocks": [
        {
          "blocks": [
            {
              "type": "text",
              "text": "Os quatro projetos da diretoria seguem a ordem definida pelo diretor. Os CTFs internos (colaboração com a Diretoria de Ensino) e a linha de Gadgets ficam fora do ranking até a diretoria decidir onde encaixam."
            }
          ]
        },
        {
          "title": "Plano de atividades da diretoria",
          "blocks": [
            {
              "type": "text",
              "text": "Em andamento"
            },
            {
              "type": "text",
              "text": "Objetivo: estabelecer os projetos, ações e entregas da diretoria."
            },
            {
              "type": "text",
              "text": "Próximo passo: identificar prioridades, responsáveis, prazos e possíveis colaborações."
            },
            {
              "type": "checklist",
              "items": [
                {
                  "text": "Definir prioridades da diretoria",
                  "done": true,
                  "note": "Feito neste levantamento"
                },
                {
                  "text": "Escolher projetos e entregas",
                  "done": true,
                  "note": "4 projetos + 1 colaboração; entregas do dashboard ainda em sugestão"
                },
                {
                  "text": "Definir responsáveis e prazos",
                  "note": "Parcial: falta a frente do dashboard; nenhum prazo"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "position": 2,
      "slug": "pendencias",
      "title": "Pendências",
      "blocks": [
        {
          "title": "Pendências de decisão",
          "blocks": [
            {
              "type": "decisions",
              "items": [
                {
                  "label": "Dashboard",
                  "text": "quem fica à frente e qual é o escopo da primeira versão."
                },
                {
                  "label": "Prazos",
                  "text": "nenhum projeto tem data."
                },
                {
                  "label": "CTFs",
                  "text": "periodicidade e o papel de Projetos na parceria com Ensino."
                },
                {
                  "label": "Cyberdeck",
                  "text": "finalidade, orçamento e quem fica à frente."
                },
                {
                  "label": "Site",
                  "text": "confirmar o requisito das fotos “sem celular” e alinhar com a Comunicação."
                },
                {
                  "label": "Mapa",
                  "text": "finalidade, ambientes e relação com a reserva de sala."
                },
                {
                  "label": "Máscara",
                  "text": "validar a proposta e levantar o orçamento."
                },
                {
                  "label": "Equipes",
                  "text": "além da frente, quem participa de cada projeto."
                }
              ]
            }
          ]
        },
        {
          "title": "Próximos passos",
          "blocks": [
            {
              "type": "checklist",
              "items": [
                {
                  "text": "Realizar a reunião do mapa e registrar as decisões"
                },
                {
                  "text": "Definir a frente do dashboard"
                },
                {
                  "text": "Alinhar os CTFs internos com a Diretoria de Ensino"
                },
                {
                  "text": "Definir finalidade e orçamento do cyberdeck"
                },
                {
                  "text": "Atualizar os cartões no Trello (lista, membros, datas)"
                },
                {
                  "text": "Definir um prazo ou marco para cada projeto"
                },
                {
                  "text": "Levar a proposta da máscara para validação"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
