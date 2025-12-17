-- 1. Enable UUIDs for unique IDs
create extension if not exists "uuid-ossp";

-- 2. Campaigns Table (Replaces 'db' storage for Campaigns)
create table campaigns (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  slug text unique not null, -- The public link identifier
  name text not null,
  brand_color text default '#000000',
  welcome_message text,
  
  -- Configuration JSON (Stores strict rules, toggles, and product IDs)
  config jsonb not null default '{}'::jsonb,
  
  -- Stats (Denormalized for fast dashboard loading)
  claims_count int default 0,
  status text default 'active' check (status in ('active', 'paused', 'archived'))
);

-- 3. Orders Table (Logs every successful claim)
create table orders (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Relations
  campaign_id uuid references campaigns(id) not null,
  
  -- Shopify Data
  shopify_order_id text, -- Stores the ID returned from Shopify API
  shopify_order_number text, 
  
  -- Influencer Data
  influencer_email text not null,
  influencer_handle text,
  influencer_name text,
  
  -- Order Details
  items jsonb not null, -- Snapshot of what they picked
  shipping_address jsonb,
  
  -- Status
  status text default 'pending' -- pending -> sent_to_shopify -> fulfilled
);

-- 4. Row Level Security (RLS) - Basic Setup
-- Enable RLS to prevent influencers from reading other campaigns' private data
alter table campaigns enable row level security;
alter table orders enable row level security;

-- Policy: Everyone can read active campaigns (needed for the public claim page)
create policy "Public campaigns are viewable by everyone" 
on campaigns for select 
using (status = 'active');

-- Policy: Anyone can insert an order (needed for the claim form submission)
create policy "Anyone can create an order" 
on orders for insert 
with check (true);