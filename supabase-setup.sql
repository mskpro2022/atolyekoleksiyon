-- Supabase'de SQL Editor'a bu kodu yapıştırın ve Run edin

create table if not exists storage (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Herkesin okuyup yazabilmesi için (authenticated users)
alter table storage enable row level security;

create policy "Authenticated users can read" on storage
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert" on storage
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update" on storage
  for update using (auth.role() = 'authenticated');

-- VEYA: Geliştirme için herkese açık (daha sonra kısıtlayın)
-- create policy "Allow all" on storage for all using (true) with check (true);
