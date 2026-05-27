-- ============================================================
-- PERSONAL FINANCE APP — Seed de Categorias (Backfill)
-- ============================================================
-- Cole no SQL Editor do Supabase e clique "Run".
-- Idempotente: pode ser rodado quantas vezes quiser.
--
-- O que faz:
--  1. Cria a funcao `seed_default_categories(uuid)` (idempotente
--     por user_id — so insere se o usuario ainda nao tem categorias).
--  2. Reinstala o trigger `on_auth_user_created` para garantir que
--     todo novo signup ja recebe categorias automaticamente.
--  3. BACKFILL: aplica a funcao para todos os usuarios existentes
--     que ainda nao tem categorias (resolve o seu caso atual).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Funcao reutilizavel de seed (idempotente)
-- ------------------------------------------------------------

create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- so insere se o usuario ainda nao tem nenhuma categoria
  if exists (select 1 from public.categories where user_id = p_user_id limit 1) then
    return;
  end if;

  insert into public.categories (user_id, name, icon, color, type) values
    -- Receitas
    (p_user_id, 'Salário',         'DollarSign',   '#00B050', 'income'),
    (p_user_id, 'Rendimentos',     'TrendingUp',   '#00B050', 'income'),
    (p_user_id, 'Outras Receitas', 'PlusCircle',   '#00B050', 'income'),
    -- Despesas
    (p_user_id, 'Alimentação',     'Utensils',     '#FF9500', 'expense'),
    (p_user_id, 'Transporte',      'Car',          '#007AFF', 'expense'),
    (p_user_id, 'Mercado',         'ShoppingCart', '#820AD1', 'expense'),
    (p_user_id, 'Moradia',         'Home',         '#5856D6', 'expense'),
    (p_user_id, 'Saúde',           'Heart',        '#F23A4A', 'expense'),
    (p_user_id, 'Lazer',           'Smile',        '#FF2D55', 'expense'),
    (p_user_id, 'Educação',        'BookOpen',     '#30B0C7', 'expense'),
    (p_user_id, 'Utilidades',      'Zap',          '#FF9500', 'expense'),
    (p_user_id, 'Outras Despesas', 'Box',          '#8E9AA8', 'expense');
end;
$$;

-- ------------------------------------------------------------
-- 2) Trigger de novo usuario: cria profile + chama seed
-- ------------------------------------------------------------
-- Sobrescreve a versao anterior (idempotente).
-- Usa `on conflict do nothing` para nao quebrar caso ja exista
-- um profile (ex: signup retry).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  perform public.seed_default_categories(new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 3) BACKFILL — aplica seed a todos os users existentes
-- ------------------------------------------------------------
-- Itera sobre auth.users e chama seed_default_categories para cada.
-- A funcao ja e idempotente, entao users que ja tem categorias sao
-- pulados silenciosamente.

do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.seed_default_categories(u.id);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 4) Verificacao (opcional)
-- ------------------------------------------------------------
-- Apos rodar, descomente para confirmar que cada user tem 12 categorias:
--
-- select u.email, count(c.id) as total_categorias
-- from auth.users u
-- left join public.categories c on c.user_id = u.id
-- group by u.email
-- order by u.email;
