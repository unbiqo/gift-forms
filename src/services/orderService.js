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
  campaignName: record.campaigns?.name || 'Standard Campaign',
  createdAt: record.created_at,
  influencerEmail: record.influencer_email,
  influencerPhone: record.influencer_phone,
  influencerInstagram: record.influencer_handle_instagram || record.influencer_handle,
  influencerTiktok: record.influencer_handle_tiktok || record.influencer_tiktok,
  influencerName: record.influencer_name,
  items: parseItems(record.items),
  shippingAddress: record.shipping_address,
  shopifyOrderId: record.shopify_order_id,
  shopifyOrderNumber: record.shopify_order_number,
  shopifyFulfillmentId: record.shopify_fulfillment_id,
  status: record.status || 'pending',
  termsConsent: record.terms_consent_accepted ?? record.terms_consent,
  marketingOptIn: record.marketing_opt_in_accepted ?? record.marketing_opt_in,
  value: deriveOrderValue(record.items),
});

export const orderService = {
  async listOrders({ limit = 50 } = {}) {
    const { data, error } = await supabase
      .from('orders')
      .select('*,campaigns(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load orders', error);
      throw error;
    }

    return (data ?? []).map(mapRecord);
  },

  async createOrder(orderData) {
    const { campaignId, items, ...customerInfo } = orderData;

    const payload = {
      campaign_id: campaignId,
      influencer_email: customerInfo.email,
      influencer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
      influencer_handle: customerInfo.instagram || customerInfo.tiktok || '',
      influencer_phone: customerInfo.phone || null,
      influencer_handle_instagram: customerInfo.instagram || '',
      influencer_handle_tiktok: customerInfo.tiktok || '',
      shipping_address: customerInfo.shippingDetails || customerInfo.address,
      items,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
