-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- 1. Profiles (Usuários)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  biometrics_enabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Categories (Categorias)
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- null para categorias padrão do sistema
  name text not null,
  icon text not null,
  color text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Accounts (Contas Bancárias/Carteiras)
create table public.accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'cash', 'investment', 'other')),
  balance numeric(12,2) default 0.00 not null,
  icon text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Credit Cards (Cartões de Crédito)
create table public.credit_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  brand text not null, -- 'visa', 'mastercard', 'elo', 'amex', etc.
  limit_total numeric(12,2) not null,
  limit_available numeric(12,2) not null,
  closing_day integer not null check (closing_day >= 1 and closing_day <= 31),
  due_day integer not null check (due_day >= 1 and due_day <= 31),
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Invoices (Faturas de Cartão)
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  credit_card_id uuid references public.credit_cards(id) on delete cascade not null,
  period text not null, -- Formato 'YYYY-MM'
  status text not null check (status in ('open', 'closed', 'paid')),
  due_date date not null,
  closing_date date not null,
  amount numeric(12,2) default 0.00 not null,
  paid_amount numeric(12,2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (credit_card_id, period)
);

-- 6. Recurrences (Recorrências e Assinaturas)
create table public.recurrences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  value numeric(12,2) not null,
  description text not null,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date not null,
  end_date date,
  active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Transactions (Transações Gerais)
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  recurrence_id uuid references public.recurrences(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  payment_method text not null check (payment_method in ('credit', 'debit', 'pix', 'cash')),
  value numeric(12,2) not null,
  description text not null,
  category_id uuid references public.categories(id) on delete set null,
  date timestamp with time zone not null,
  transfer_target_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Installments (Parcelas de Compras no Crédito)
create table public.installments (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  installment_number integer not null,
  total_installments integer not null,
  value numeric(12,2) not null,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  due_date date not null,
  status text not null check (status in ('unpaid', 'paid')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- ÍNDICES PARA PERFORMANCE
-- =========================================================================
create index idx_profiles_email on public.profiles(email);
create index idx_categories_user_id on public.categories(user_id);
create index idx_accounts_user_id on public.accounts(user_id);
create index idx_credit_cards_user_id on public.credit_cards(user_id);
create index idx_invoices_card_period on public.invoices(credit_card_id, period);
create index idx_recurrences_user_id on public.recurrences(user_id);
create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_account_id on public.transactions(account_id);
create index idx_transactions_card_id on public.transactions(credit_card_id);
create index idx_transactions_invoice_id on public.transactions(invoice_id);
create index idx_installments_invoice_id on public.installments(invoice_id);

-- =========================================================================
-- TRIGGERS E FUNÇÕES AUTOMÁTICAS
-- =========================================================================

-- Trigger para updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger tr_profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger tr_accounts_updated_at before update on public.accounts for each row execute procedure public.handle_updated_at();
create trigger tr_credit_cards_updated_at before update on public.credit_cards for each row execute procedure public.handle_updated_at();
create trigger tr_invoices_updated_at before update on public.invoices for each row execute procedure public.handle_updated_at();
create trigger tr_transactions_updated_at before update on public.transactions for each row execute procedure public.handle_updated_at();

-- Trigger para criar perfil de usuário ao registrar no Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- SECURITY (ROW LEVEL SECURITY)
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.credit_cards enable row level security;
alter table public.invoices enable row level security;
alter table public.recurrences enable row level security;
alter table public.transactions enable row level security;
alter table public.installments enable row level security;

-- Policies public.profiles
create policy "Usuários podem ver seu próprio perfil" on public.profiles for select using (auth.uid() = id);
create policy "Usuários podem atualizar seu próprio perfil" on public.profiles for update using (auth.uid() = id);

-- Policies public.categories
create policy "Usuários podem ver categorias globais ou criadas por si" on public.categories for select using (user_id is null or auth.uid() = user_id);
create policy "Usuários podem gerenciar suas próprias categorias" on public.categories for all using (auth.uid() = user_id);

-- Policies public.accounts
create policy "Usuários podem gerenciar suas próprias contas" on public.accounts for all using (auth.uid() = user_id);

-- Policies public.credit_cards
create policy "Usuários podem gerenciar seus próprios cartões" on public.credit_cards for all using (auth.uid() = user_id);

-- Policies public.invoices
create policy "Usuários podem gerenciar faturas dos seus cartões" on public.invoices for all using (
  exists (
    select 1 from public.credit_cards
    where public.credit_cards.id = public.invoices.credit_card_id
    and public.credit_cards.user_id = auth.uid()
  )
);

-- Policies public.recurrences
create policy "Usuários podem gerenciar suas próprias recorrências" on public.recurrences for all using (auth.uid() = user_id);

-- Policies public.transactions
create policy "Usuários podem gerenciar suas próprias transações" on public.transactions for all using (auth.uid() = user_id);

-- Policies public.installments
create policy "Usuários podem gerenciar parcelas ligadas a faturas acessíveis" on public.installments for all using (
  exists (
    select 1 from public.invoices
    join public.credit_cards on public.credit_cards.id = public.invoices.credit_card_id
    where public.invoices.id = public.installments.invoice_id
    and public.credit_cards.user_id = auth.uid()
  )
);

-- =========================================================================
-- CATEGORIAS PADRÃO DO SISTEMA
-- =========================================================================
insert into public.categories (name, icon, color, type) values
  ('Alimentação', 'Utensils', '#FF9500', 'expense'),
  ('Transporte', 'Car', '#007AFF', 'expense'),
  ('Lazer', 'Smile', '#5856D6', 'expense'),
  ('Mercado', 'ShoppingCart', '#34C759', 'expense'),
  ('Saúde', 'Heart', '#FF2D55', 'expense'),
  ('Educação', 'BookOpen', '#AF52DE', 'expense'),
  ('Salário', 'DollarSign', '#34C759', 'income'),
  ('Investimentos', 'TrendingUp', '#007AFF', 'income'),
  ('Outras Receitas', 'PlusCircle', '#34C759', 'income'),
  ('Outras Despesas', 'Box', '#8E8E93', 'expense');
