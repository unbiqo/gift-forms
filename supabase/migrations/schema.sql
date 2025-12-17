-- 1. Enable UUIDs for unique IDs
create extension if not exists "uuid-ossp";

-- 2. Campaigns Table
create table campaigns (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  slug text unique not null,
  name text not null,
  brand_color text default '#000000',
  welcome_message text,
  config jsonb not null default '{}'::jsonb,
  claims_count int default 0,
  status text default 'active' check (status in ('active', 'paused', 'archived'))
);

-- 3. Orders Table
create table orders (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  campaign_id uuid references campaigns(id) not null,
  shopify_order_id text,
  shopify_order_number text, 
  influencer_email text not null,
  influencer_handle text,
  influencer_name text,
  items jsonb not null,
  shipping_address jsonb,
  status text default 'pending'
);

-- 4. Enable Row Level Security (RLS)
alter table campaigns enable row level security;
alter table orders enable row level security;

-- 5. Campaign Policies
-- Allow public reading of active campaigns for the storefront
create policy "Enable public read for active campaigns"
on campaigns for select
using (status = 'active');

-- Dashboard/Admin access (manage everything via anon key)
create policy "Dashboard can manage campaigns"
on campaigns for insert
with check (auth.role() in ('anon', 'service_role'));

create policy "Dashboard can update campaigns"
on campaigns for update
using (auth.role() in ('anon', 'service_role'))
with check (auth.role() in ('anon', 'service_role'));

create policy "Dashboard can archive campaigns"
on campaigns for delete
using (auth.role() in ('anon', 'service_role'));

-- 6. Order Policies
-- Allow anyone to create an order (the influencer form)
create policy "Enable insert for orders" 
on orders for insert 
with check (true);

-- Allow dashboard to view orders
create policy "Dashboard can view orders"
on orders for select
using (auth.role() in ('anon', 'service_role'));