-- Regras de acesso: owner escreve, member lê, none/anon não vê nada.

-- Função de apoio usada pelas políticas (criada antes delas).
create function public.current_access()
returns public.access_level
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.access
       from public.people p
      where lower(p.email) = lower(auth.jwt() ->> 'email')
      limit 1),
    'none'::public.access_level
  );
$$;

-- Privilégios de tabela explícitos: quem decide o acesso são as políticas.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- RLS + políticas nas sete tabelas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'people', 'projects', 'project_members', 'sprints',
    'tasks', 'task_items', 'pages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using ((select public.current_access()) in (''owner'', ''member''))',
      t || '_select', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select public.current_access()) = ''owner'')',
      t || '_insert', t);

    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select public.current_access()) = ''owner'')
         with check ((select public.current_access()) = ''owner'')',
      t || '_update', t);

    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select public.current_access()) = ''owner'')',
      t || '_delete', t);
  end loop;
end
$$;

-- Funções de membro: marcar item e mudar status de tarefa.
create function public.set_task_item_done(item_id uuid, is_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.current_access()) not in ('owner', 'member') then
    raise exception 'acesso negado';
  end if;
  update public.task_items set done = is_done where id = item_id;
end;
$$;

create function public.set_task_status(task_id uuid, new_status public.task_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.current_access()) not in ('owner', 'member') then
    raise exception 'acesso negado';
  end if;
  update public.tasks set status = new_status where id = task_id;
end;
$$;

revoke execute on function public.current_access() from anon, public;
revoke execute on function public.set_task_item_done(uuid, boolean) from anon, public;
revoke execute on function public.set_task_status(uuid, public.task_status) from anon, public;
grant execute on function public.current_access() to authenticated;
grant execute on function public.set_task_item_done(uuid, boolean) to authenticated;
grant execute on function public.set_task_status(uuid, public.task_status) to authenticated;
