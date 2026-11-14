# Dashboard de Projetos da LASETE

Painel interno da Diretoria de Projetos: projetos, tarefas, sprints e pessoas da liga. O dono edita tudo; membros com acesso leem tudo e podem marcar itens e mudar o status das tarefas. React + Vite + Tailwind, dados no Firestore, login com Firebase Authentication.

## Rodar

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do app web do Firebase
npm run dev
```

O conteúdo inicial (levantamento) é importado só pelo `npm run dev`, com o banco vazio, pelo botão "Importar conteúdo inicial"; ele não vai no build de produção.

`.env.local` fica fora do git. `VITE_OWNER_UID` é o UID do dono (o mesmo de `firestore.rules`).

## Testes

- `npm test`: testes de interface e lógica (Vitest).
- `npm run test:rules`: testa as regras do Firestore no emulador. Precisa de Java instalado.

## Acesso

O dono é o usuário cujo UID está em `firestore.rules`. Para dar acesso a outra pessoa:

1. No console do Firebase, em Authentication, crie o usuário (e-mail e senha) e copie o UID.
2. No app, abra a pessoa em Pessoas.
3. Cole o UID e marque "Pode entrar no dashboard (membro)".

Membros veem tudo e só podem marcar itens e mudar o status das tarefas; criar, editar e apagar é só do dono.

## Publicar

Site (Firebase Hosting):

```bash
npm run build
npx firebase deploy --only hosting --project projetos-dashboard
```

`firebase.json` tem só o Hosting, então um `firebase deploy` sem filtro não sobrescreve as regras. A configuração do Firestore e do emulador fica em `firebase.emulator.json` (usada por `npm run test:rules`).

Regras do Firestore: faça uma cópia de `firestore.rules` fora do repositório, troque `OWNER_UID_PLACEHOLDER` pelo UID do dono e publique essa cópia com um `firebase.json` temporário que aponte para ela (`{"firestore": {"rules": "caminho/da/copia.rules"}}`) e `npx firebase deploy --only firestore:rules --project projetos-dashboard`. Nunca grave o UID real no arquivo versionado: os testes das regras dependem do placeholder.

## Exportar

O botão "Exportar" fica na tela Projetos (exporta todos os projetos) e em cada página de projeto (exporta aquele projeto). O menu tem "Baixar .html" (arquivo único, funciona offline), "Salvar .pdf" e "Baixar .md".

## Onde fica o quê

- `src/screens`: telas (Visão geral, Projetos, Tarefas, Pessoas, páginas personalizadas).
- `src/tasks`: lista, quadro, filtros e painel lateral de tarefa.
- `src/edit`: formulários de criação e edição (só o dono).
- `src/export`: geração de HTML, PDF e Markdown.
- `src/data`: carregamento dos dados do Firestore e importação do seed.
- `src/lib`: tipos, API, cálculos derivados, Firebase e movimento (rolagem suave e entradas).
