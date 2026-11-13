# Dashboard de Projetos da LASETE

Painel interno da Diretoria de Projetos: projetos, tarefas, sprints e pessoas da liga. O dono edita; membros com acesso só leem. React + Vite + Tailwind, dados no Firestore, login com Firebase Authentication.

## Rodar

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do app web do Firebase
npm run dev
```

`.env.local` fica fora do git. `VITE_OWNER_UID` é o UID do dono (o mesmo de `firestore.rules`).

## Testes

- `npm test`: testes de interface e lógica (Vitest).
- `npm run test:rules`: testa as regras do Firestore no emulador. Precisa de Java instalado.

## Acesso

O dono é o usuário cujo UID está em `firestore.rules`. Para dar acesso a outra pessoa:

1. No console do Firebase, em Authentication, crie o usuário (e-mail e senha) e copie o UID.
2. No app, abra a pessoa em Pessoas.
3. Cole o UID e marque "Pode entrar no dashboard (membro)".

Membros veem tudo e não editam nada.

## Publicar

Site (Firebase Hosting):

```bash
npm run build
npx firebase deploy --only hosting --project projetos-dashboard
```

Regras do Firestore: em uma cópia de `firestore.rules`, troque `OWNER_UID_PLACEHOLDER` pelo UID do dono e publique essa cópia com `--only firestore:rules`. Nunca grave o UID real no arquivo versionado: os testes das regras dependem do placeholder.

## Exportar

O botão "Exportar" do cabeçalho gera o painel em HTML (arquivo único, funciona offline), PDF e Markdown.

## Onde fica o quê

- `src/screens`: telas (Visão geral, Projetos, Tarefas, Pessoas, páginas personalizadas).
- `src/tasks`: lista, quadro, filtros e painel lateral de tarefa.
- `src/edit`: formulários de criação e edição (só o dono).
- `src/export`: geração de HTML, PDF e Markdown.
- `src/data`: carregamento dos dados do Firestore e importação do seed.
- `src/lib`: tipos, API, cálculos derivados, Firebase e movimento (rolagem suave e entradas).
