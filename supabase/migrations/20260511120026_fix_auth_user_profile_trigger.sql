create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_email boolean;
  has_name boolean;
  has_full_name boolean;
  has_role boolean;
  has_avatar_url boolean;
  has_updated_at boolean;
  display_name text;
  profile_role text;
  insert_columns text := 'id';
  insert_values text := '$1';
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) into has_email;

  if not has_email then
    return new;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) into has_email;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'name'
  ) into has_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name'
  ) into has_full_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) into has_role;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url'
  ) into has_avatar_url;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) into has_updated_at;

  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  );

  profile_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');

  if has_email then
    insert_columns := insert_columns || ', email';
    insert_values := insert_values || ', $2';
  end if;

  if has_name then
    insert_columns := insert_columns || ', name';
    insert_values := insert_values || ', $3';
  end if;

  if has_full_name then
    insert_columns := insert_columns || ', full_name';
    insert_values := insert_values || ', $3';
  end if;

  if has_role then
    insert_columns := insert_columns || ', role';
    insert_values := insert_values || ', $4';
  end if;

  if has_avatar_url then
    insert_columns := insert_columns || ', avatar_url';
    insert_values := insert_values || ', null';
  end if;

  if has_updated_at then
    insert_columns := insert_columns || ', updated_at';
    insert_values := insert_values || ', now()';
  end if;

  execute format(
    'insert into public.profiles (%s) values (%s) on conflict (id) do nothing',
    insert_columns,
    insert_values
  )
  using new.id, new.email, nullif(display_name, ''), profile_role;

  return new;
exception
  when check_violation or invalid_text_representation then
    if has_role then
      execute format(
        'insert into public.profiles (%s) values (%s) on conflict (id) do nothing',
        insert_columns,
        replace(insert_values, '$4', '$5')
      )
      using new.id, new.email, nullif(display_name, ''), profile_role, 'viewer';
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
