-- ============================================================
-- PERSONAL FINANCE APP — Supabase Schema
-- Cole TUDO de uma vez no SQL Editor do Supabase (botão "Run")
-- ============================================================

-- ------------------------------------------------------------
-- 1) TABELAS
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text not null default '',
  biometrics_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking','savings','cash','investment','other')),
  balance numeric(14,2) not null default 0,
  icon text not null default 'Wallet',
  color text not null default '#820AD1',
  created_at timestamptz not null default now()
);

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text not null default '',
  limit_total numeric(14,2) not null,
  limit_available numeric(14,2) not null,
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  color text not null default '#820AD1',
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  period text not null,
  status text not null default 'open' check (status in ('open','closed','paid')),
  due_date date not null,
  closing_date date not null,
  amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (credit_card_id, period)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'Box',
  color text not null default '#820AD1',
  type text not null check (type in ('income','expense')),
  created_at timestamptz not null default now()
);

create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  value numeric(14,2) not null,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  recurrence_id uuid references public.recurrences(id) on delete set null,
  type text not null check (type in ('income','expense','transfer')),
  payment_method text not null check (payment_method in ('credit','debit','pix','cash')),
  value numeric(14,2) not null,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  date timestamptz not null default now(),
  transfer_target_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  tags text[],
  created_at timestamptz not null default now()
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  installment_number int not null,
  total_installments int not null,
  value numeric(14,2) not null,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) ÍNDICES (performance)
-- ------------------------------------------------------------

create index on public.accounts(user_id);
create index on public.credit_cards(user_id);
create index on public.invoices(credit_card_id);
create index on public.categories(user_id);
create index on public.transactions(user_id);
create index on public.transactions(date desc);
create index on public.installments(transaction_id);
create index on public.installments(invoice_id);
create index on public.recurrences(user_id);

-- ------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.accounts      enable row level security;
alter table public.credit_cards  enable row level security;
alter table public.invoices      enable row level security;
alter table public.categories    enable row level security;
alter table public.transactions  enable row level security;
alter table public.installments  enable row level security;
alter table public.recurrences   enable row level security;

-- profiles: usuário só vê/edita o próprio
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- accounts / credit_cards / categories / transactions / recurrences: dono por user_id
create policy "accounts_owner_all"      on public.accounts      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "credit_cards_owner_all"  on public.credit_cards  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_owner_all"    on public.categories    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_owner_all"  on public.transactions  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurrences_owner_all"   on public.recurrences   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- invoices: dono pelo credit_card.user_id
create policy "invoices_owner_all" on public.invoices
  for all
  using (exists (
    select 1 from public.credit_cards c
    where c.id = invoices.credit_card_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.credit_cards c
    where c.id = invoices.credit_card_id and c.user_id = auth.uid()
  ));

-- installments: dono pela transaction.user_id
create policy "installments_owner_all" on public.installments
  for all
  using (exists (
    select 1 from public.transactions t
    where t.id = installments.transaction_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.transactions t
    where t.id = installments.transaction_id and t.user_id = auth.uid()
  ));

-- ------------------------------------------------------------
-- 4) TRIGGER: ao criar conta, gerar profile + categorias padrão
-- ------------------------------------------------------------

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
  );

  insert into public.categories (user_id, name, icon, color, type) values
    (new.id, 'Salário',         'DollarSign',   '#00B050', 'income'),
    (new.id, 'Rendimentos',     'TrendingUp',   '#00B050', 'income'),
    (new.id, 'Outras Receitas', 'PlusCircle',   '#00B050', 'income'),
    (new.id, 'Alimentação',     'Utensils',     '#FF9500', 'expense'),
    (new.id, 'Transporte',      'Car',          '#007AFF', 'expense'),
    (new.id, 'Mercado',         'ShoppingCart', '#820AD1', 'expense'),
    (new.id, 'Moradia',         'Home',         '#5856D6', 'expense'),
    (new.id, 'Saúde',           'Heart',        '#F23A4A', 'expense'),
    (new.id, 'Lazer',           'Smile',        '#FF2D55', 'expense'),
    (new.id, 'Educação',        'BookOpen',     '#30B0C7', 'expense'),
    (new.id, 'Utilidades',      'Zap',          '#FF9500', 'expense'),
    (new.id, 'Outras Despesas', 'Box',          '#8E9AA8', 'expense');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
