import { supabase } from '../lib/supabaseClient';

// --- STATIC PRODUCT CATALOG ---
const PRODUCT_CATALOG = [
  { id: 'p1', title: 'Vintage Leather Jacket', price: 650, image: 'https://images.unsplash.com/photo-1551028919-ac669d6301dd?auto=format&fit=crop&q=80&w=300' },
  { id: 'p2', title: 'Performance Energy Drink', price: 45, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300' },
  { id: 'p3', title: 'Hydrating Face Cream', price: 120, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300' },
  { id: 'p4', title: 'Ceramic Diffuser', price: 55, image: 'https://images.unsplash.com/photo-1616486029423-aaa478965c97?auto=format&fit=crop&q=80&w=300' },
  { id: 'p5', title: 'Silk Pillowcase', price: 85, image: 'https://images.unsplash.com/photo-1576014131795-d4c3a283033f?auto=format&fit=crop&q=80&w=300' },
  { id: 'p6', title: 'Matcha Kit (Sold Out)', price: 40, image: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&q=80&w=300' },
];

export const campaignService = {
  
  /**
   * INFLUENCER VIEW: Fetch a campaign by its public link (slug)
   */
  async getCampaignBySlug(slug) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }

    // Convert snake_case DB columns to camelCase for the React App
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      welcomeMessage: data.welcome_message,
      brandColor: data.brand_color,
      selectedProductIds: data.selected_product_ids || [], // Ensure array
      itemLimit: data.item_limit,
      orderLimitPerLink: data.order_limit_per_link,
      maxCartValue: data.max_cart_value,
      shippingZone: data.shipping_zone,
      restrictedCountries: data.restricted_countries,
      showPhoneField: data.show_phone_field,
      showInstagramField: data.show_instagram_field,
      showTiktokField: data.show_tiktok_field,
      askCustomQuestion: data.ask_custom_question,
      customQuestionLabel: data.custom_question_label,
      customQuestionRequired: data.custom_question_required,
      termsConsentText: data.terms_consent_text,
      showConsentCheckbox: data.show_consent_checkbox,
      requireSecondConsent: data.require_second_consent,
      secondConsentText: data.second_consent_text,
      emailOptIn: data.email_opt_in,
      emailConsentText: data.email_consent_text,
      submitButtonText: data.submit_button_text,
      
      // Configuration bits that might still be in JSON or implied
      gridTwoByTwo: true, // defaulting for UI
      showSoldOut: true,
      linkToStore: data.link_to_store,
      linkText: data.link_text
    };
  },

  /**
   * ADMIN DASHBOARD: Fetch all campaigns
   */
  async getAllCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .neq('status', 'archived');
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
    return data;
  },

  /**
   * ADMIN BUILDER: Create a new campaign
   * Maps camelCase frontend state to snake_case DB columns
   */
  async createCampaign(campaignData) {
    const payload = {
      name: campaignData.name,
      slug: campaignData.slug,
      welcome_message: campaignData.welcomeMessage,
      brand_color: campaignData.brandColor,
      
      // Mapping detailed fields to your new columns
      selected_product_ids: campaignData.selectedProductIds,
      item_limit: campaignData.itemLimit || 1,
      order_limit_per_link: campaignData.orderLimitPerLink ? parseInt(campaignData.orderLimitPerLink) : null,
      max_cart_value: campaignData.maxCartValue ? parseFloat(campaignData.maxCartValue) : null,
      block_duplicate_orders: campaignData.blockDuplicateOrders,
      
      shipping_zone: campaignData.shippingZone,
      restricted_countries: campaignData.restrictedCountries,
      
      show_phone_field: campaignData.requirePhone, // Note mapping difference in state vs db
      show_instagram_field: campaignData.showInstagramField,
      show_tiktok_field: campaignData.showTiktokField,
      
      ask_custom_question: campaignData.askCustomQuestion,
      custom_question_label: campaignData.customQuestionLabel,
      custom_question_required: campaignData.customQuestionRequired,
      
      show_consent_checkbox: campaignData.showConsentCheckbox,
      terms_consent_text: campaignData.termsConsentText,
      require_second_consent: campaignData.requireSecondConsent,
      second_consent_text: campaignData.secondConsentText,
      email_opt_in: campaignData.emailOptIn,
      email_consent_text: campaignData.emailConsentText,
      submit_button_text: campaignData.submitButtonText,
      
      link_to_store: campaignData.linkToStore,
      link_text: campaignData.linkText,
      
      status: 'active',
      claims_count: 0
    };

    const { data, error } = await supabase
      .from('campaigns')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * INFLUENCER ACTION: Submit an order
   */
  async createOrder(orderData) {
    const { campaignId, items, ...customerInfo } = orderData;

    const payload = {
      campaign_id: campaignId,
      influencer_email: customerInfo.email,
      influencer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
      influencer_handle: customerInfo.instagram || customerInfo.tiktok || '',
      shipping_address: customerInfo.address, // Assuming text or JSON based on your table
      items: items, // Stores the array of selected products
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

  /**
   * ADMIN DASHBOARD: Soft-delete a campaign by marking its status.
   */
  async deleteCampaign(id) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
    return { id };
  },

  getProducts() {
    return PRODUCT_CATALOG;
  }
};
