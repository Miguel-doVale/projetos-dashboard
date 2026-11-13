-- Testes de acesso (RLS + funções). Roda numa transação e termina com rollback.
begin;

-- Fixture (como papel privilegiado)
insert into public.people (id, name, email, access) values
  ('00000000-0000-0000-0000-0000000000a1', 'Owner',  'owner@t.dev',  'owner'),
  ('00000000-0000-0000-0000-0000000000a2', 'Member', 'member@t.dev', 'member'),
  ('00000000-0000-0000-0000-0000000000a3', 'None',   'none@t.dev',   'none');

insert into public.projects (id, position, number, title) values
  ('00000000-0000-0000-0000-0000000000b1', 1, '01', 'Projeto teste');

-- A pessoa "none" é a responsável pela tarefa (usada no teste de set null).
insert into public.tasks (id, project_id, title, assignee_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
   'Tarefa teste', '00000000-0000-0000-0000-0000000000a3');

insert into public.task_items (id, task_id, kind, text) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   'scope', 'Item teste');

-- ============ Sessão: member ============
set local role authenticated;
set local request.jwt.claims = '{"email":"member@t.dev","role":"authenticated"}';

do $$
declare n bigint;
begin
  select count(*) into n from public.tasks;
  assert n = 1, 'member: select count(*) from tasks deveria ser 1, foi ' || n;
end $$;

do $$
declare n bigint;
begin
  update public.tasks set title = 'x';
  get diagnostics n = row_count;
  assert n = 0, 'member: update tasks deveria afetar 0 linhas, afetou ' || n;
end $$;

do $$
declare n bigint;
begin
  delete from public.projects;
  get diagnostics n = row_count;
  assert n = 0, 'member: delete projects deveria afetar 0 linhas, afetou ' || n;
end $$;

do $$
declare raised boolean := false;
begin
  begin
    insert into public.people (name, email) values ('Intruso', 'intruso@t.dev');
  exception when insufficient_privilege then
    raised := true;
  end;
  assert raised, 'member: insert into people deveria falhar com violação de política';
end $$;

do $$
declare d boolean;
begin
  perform public.set_task_item_done('00000000-0000-0000-0000-0000000000d1', true);
  select done into d from public.task_items
   where id = '00000000-0000-0000-0000-0000000000d1';
  assert d is true, 'member: set_task_item_done deveria deixar done = true';
end $$;

do $$
declare s public.task_status;
begin
  perform public.set_task_status('00000000-0000-0000-0000-0000000000c1', 'done');
  select status into s from public.tasks
   where id = '00000000-0000-0000-0000-0000000000c1';
  assert s = 'done', 'member: set_task_status deveria deixar status = done, foi ' || s;
end $$;

-- ============ Sessão: none ============
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email":"none@t.dev","role":"authenticated"}';

do $$
declare n bigint;
begin
  select count(*) into n from public.projects;
  assert n = 0, 'none: select count(*) from projects deveria ser 0, foi ' || n;
end $$;

do $$
declare raised boolean := false;
begin
  begin
    perform public.set_task_status('00000000-0000-0000-0000-0000000000c1', 'todo');
  exception when raise_exception then
    raised := true;
  end;
  assert raised, 'none: set_task_status deveria lançar exceção';
end $$;

-- ============ Sessão: e-mail sem pessoa cadastrada ============
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email":"ninguem@t.dev","role":"authenticated"}';

do $$
declare n bigint;
begin
  select count(*) into n from public.people;
  assert n = 0, 'sem pessoa: select count(*) from people deveria ser 0, foi ' || n;
end $$;

-- ============ Sessão: anon ============
-- anon não tem privilégio de tabela (revoke all); "permission denied" também
-- significa que nada é visível, então aceitamos 0 linhas ou esse erro.
reset role;
set local request.jwt.claims = '';
set local role anon;

do $$
declare n bigint := 0;
begin
  begin
    select count(*) into n from public.projects;
  exception when insufficient_privilege then
    n := 0;
  end;
  assert n = 0, 'anon: select count(*) from projects deveria ser 0, foi ' || n;
end $$;

-- ============ Sessão: owner ============
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email":"OWNER@t.dev","role":"authenticated"}';

do $$
declare n bigint;
begin
  update public.tasks set title = 'x';
  get diagnostics n = row_count;
  assert n = 1, 'owner: update tasks deveria afetar 1 linha, afetou ' || n;
end $$;

-- Apagar a pessoa responsável deixa a tarefa sem responsável.
do $$
declare a uuid; n bigint;
begin
  delete from public.people where id = '00000000-0000-0000-0000-0000000000a3';
  get diagnostics n = row_count;
  assert n = 1, 'owner: delete da pessoa responsável deveria afetar 1 linha, afetou ' || n;
  select assignee_id into a from public.tasks
   where id = '00000000-0000-0000-0000-0000000000c1';
  assert a is null, 'owner: apagar a pessoa responsável deveria deixar assignee_id null';
end $$;

-- Apagar o projeto leva tarefas e itens junto (cascade).
do $$
declare n bigint; t bigint; i bigint;
begin
  delete from public.projects;
  get diagnostics n = row_count;
  assert n = 1, 'owner: delete projects deveria remover 1 projeto, removeu ' || n;
  select count(*) into t from public.tasks;
  select count(*) into i from public.task_items;
  assert t = 0, 'owner: tasks deveria ficar com 0 linhas após apagar o projeto, tem ' || t;
  assert i = 0, 'owner: task_items deveria ficar com 0 linhas após apagar o projeto, tem ' || i;
end $$;

reset role;
set local request.jwt.claims = '';

select 'access tests ok' as result;

rollback;
