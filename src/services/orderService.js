import { supabase } from '../lib/supabaseClient';

const parseItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;

  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
};

const deriveOrderValue = (items) => {
  return parseItems(items).reduce((sum, item) => {
    const value = Number(item?.price ?? item?.value ?? 0);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);
};

const mapRecord = (record) => ({
  id: record.id,
  campaignId: record.campaign_id,
  createdAt: record.created_at,
  influencerEmail: record.influencer_email,
  influencerHandle: record.influencer_handle,
  influencerName: record.influencer_name,
  items: parseItems(record.items),
  shippingAddress: record.shipping_address,
  shopifyOrderId: record.shopify_order_id,
  shopifyOrderNumber: record.shopify_order_number,
  status: record.status || 'pending',
  value: deriveOrderValue(record.items),
});

export const orderService = {
  async listOrders({ limit = 50 } = {}) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load orders', error);
      throw error;
    }

    return (data ?? []).map(mapRecord);
  },
};
