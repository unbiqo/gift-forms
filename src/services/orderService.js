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

const mapDuplicateRecord = (record) => ({
  id: record.id,
  campaignId: record.campaign_id,
  campaignName: record.campaigns?.name || 'Standard Campaign',
  influencerInfo: (() => {
    if (!record.influencer_info) return {};
    if (typeof record.influencer_info === 'string') {
      try {
        return JSON.parse(record.influencer_info);
      } catch {
        return {};
      }
    }
    return record.influencer_info;
  })(),
  decision: (typeof record.influencer_info === 'object' && record.influencer_info?.decision) || 'pending',
  reason: record.reason || 'Duplicate Attempt',
  createdAt: record.created_at,
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

  async checkDuplicate(campaignId, { email, phone, instagram, tiktok }) {
    const filters = [];
    if (email) filters.push(`influencer_email.eq.${email}`);
    if (phone) filters.push(`influencer_phone.eq.${phone}`);
    if (instagram) filters.push(`influencer_handle_instagram.eq.${instagram}`);
    if (tiktok) filters.push(`influencer_handle_tiktok.eq.${tiktok}`);
    if (!filters.length) return false;

    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('campaign_id', campaignId)
      .or(filters.join(','))
      .limit(1);

    if (error) {
      console.error('Failed to check duplicates', error);
      return false;
    }
    return Boolean(data && data.length);
  },

  async logDuplicateAttempt({ campaignId, influencerInfo, reason }) {
    const payload = {
      campaign_id: campaignId,
      influencer_info: { ...influencerInfo, decision: influencerInfo?.decision || 'pending' },
      reason,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('duplicate_attempts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Failed to log duplicate attempt', error);
      throw error;
    }
    return data;
  },

  async listDuplicateAttempts({ limit = 50 } = {}) {
    const { data, error } = await supabase
      .from('duplicate_attempts')
      .select('*,campaigns(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load duplicate attempts', error);
      throw error;
    }
    return (data ?? []).map(mapDuplicateRecord);
  },

  async acceptDuplicateAttempt(id) {
    const { data, error } = await supabase
      .from('duplicate_attempts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Failed to load duplicate attempt for accept', error);
      throw error || new Error('Duplicate attempt not found');
    }

    const info = data.influencer_info || {};
    const orderPayload = {
      campaignId: data.campaign_id,
      items: info.items || [],
      email: info.email,
      firstName: info.firstName || info.name?.split(' ')[0] || '',
      lastName: info.lastName || info.name?.split(' ').slice(1).join(' ') || '',
      phone: info.phone,
      instagram: info.instagram,
      tiktok: info.tiktok,
      address: info.address,
      shippingDetails: info.shippingDetails || info.address,
      consentPrimary: info.consentPrimary ?? true,
      consentSecondary: info.consentSecondary ?? false
    };

    await this.createOrder(orderPayload);

    const { error: deleteError } = await supabase
      .from('duplicate_attempts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete duplicate attempt after accept', deleteError);
    }
  },

  async declineDuplicateAttempt(id) {
    const { error } = await supabase
      .from('duplicate_attempts')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Failed to decline duplicate attempt', error);
      throw error;
    }
  },

  async setDuplicateDecision(id, decision = 'pending') {
    const { data, error } = await supabase
      .from('duplicate_attempts')
      .select('influencer_info')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Failed to load duplicate attempt for update', error);
      return;
    }
    const currentInfo = data?.influencer_info || {};
    const nextInfo = { ...currentInfo, decision };
    const { error: updateError } = await supabase
      .from('duplicate_attempts')
      .update({ influencer_info: nextInfo })
      .eq('id', id);
    if (updateError) {
      console.error('Failed to set duplicate decision', updateError);
    }
  }
};
