-- Create a mock campaign for testing the B2B Dashboard
INSERT INTO public.campaigns (slug, name, brand_color, welcome_message, status, config)
VALUES (
  'summer-vibe-2025', 
  'Summer Glow Influencer Kit', 
  '#FF5733', 
  'Welcome to the Summer 2025 Gifting Campaign! Pick your favorites below.', 
  'active',
  '{"allowed_products": ["prod_1", "prod_2"], "max_items": 3}'::jsonb
);

-- Create a mock order for the campaign above
INSERT INTO public.orders (campaign_id, influencer_email, influencer_handle, influencer_name, items, status)
SELECT 
  id, 
  'test-influencer@example.com', 
  '@summer_vibe', 
  'Jane Doe', 
  '[{"id": "prod_1", "name": "Sunscreen Pro"}]'::jsonb,
  'pending'
FROM public.campaigns 
WHERE slug = 'summer-vibe-2025'
LIMIT 1;