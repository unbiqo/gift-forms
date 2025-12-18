import { supabase } from '../lib/supabaseClient';

// --- STATIC PRODUCT CATALOG ---
const PRODUCT_CATALOG = [
  { id: 'p1', title: 'Vintage Leather Jacket', price: 650, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600' },
  { id: 'p2', title: 'Performance Energy Drink', price: 45, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300' },
  { id: 'p3', title: 'Hydrating Face Cream', price: 120, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300' },
  { id: 'p4', title: 'Ceramic Diffuser', price: 55, image: 'https://images.unsplash.com/photo-1595433707802-68267d349c2d?auto=format&fit=crop&q=80&w=600' },
  { id: 'p5', title: 'Silk Pillowcase', price: 85, image: 'https://images.unsplash.com/photo-1576014131795-d4c3a283033f?auto=format&fit=crop&q=80&w=300' },
  { id: 'p6', title: 'Matcha Kit (Sold Out)', price: 40, image: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&q=80&w=300' },
];

const buildConfigFromCampaignData = (campaignData = {}) => {
  return {
    selectedProductIds: campaignData.selectedProductIds || [],
    itemLimit: campaignData.itemLimit || 1,
    orderLimitPerLink: campaignData.orderLimitPerLink ? parseInt(campaignData.orderLimitPerLink, 10) : null,
    maxCartValue: campaignData.maxCartValue ? parseFloat(campaignData.maxCartValue) : null,
    blockDuplicateOrders: Boolean(campaignData.blockDuplicateOrders),
    shippingZone: campaignData.shippingZone || '',
    restrictedCountries: campaignData.restrictedCountries || '',
    showPhoneField: Boolean(campaignData.showPhoneField),
    showInstagramField: Boolean(campaignData.showInstagramField),
    showTiktokField: Boolean(campaignData.showTiktokField),
    askCustomQuestion: Boolean(campaignData.askCustomQuestion),
    customQuestionLabel: campaignData.customQuestionLabel || '',
    customQuestionRequired: Boolean(campaignData.customQuestionRequired),
    showConsentCheckbox: Boolean(campaignData.showConsentCheckbox),
    termsConsentText: campaignData.termsConsentText || '',
    requireSecondConsent: Boolean(campaignData.requireSecondConsent),
    secondConsentText: campaignData.secondConsentText || '',
    emailOptIn: Boolean(campaignData.emailOptIn),
    emailConsentText: campaignData.emailConsentText || '',
    submitButtonText: campaignData.submitButtonText || '',
    linkToStore: campaignData.linkToStore || '',
    linkText: campaignData.linkText || '',
    gridTwoByTwo: 'gridTwoByTwo' in campaignData ? Boolean(campaignData.gridTwoByTwo) : true,
    showSoldOut: 'showSoldOut' in campaignData ? Boolean(campaignData.showSoldOut) : true,
  };
};

const mapCampaignConfig = (config = {}) => ({
  selectedProductIds: config.selectedProductIds || [],
  itemLimit: config.itemLimit || 1,
  orderLimitPerLink: config.orderLimitPerLink ?? null,
  maxCartValue: config.maxCartValue ?? null,
  blockDuplicateOrders: config.blockDuplicateOrders ?? false,
  shippingZone: config.shippingZone || '',
  restrictedCountries: config.restrictedCountries || '',
  showPhoneField: config.showPhoneField ?? false,
  showInstagramField: config.showInstagramField ?? false,
  showTiktokField: config.showTiktokField ?? false,
  askCustomQuestion: config.askCustomQuestion ?? false,
  customQuestionLabel: config.customQuestionLabel || '',
  customQuestionRequired: config.customQuestionRequired ?? false,
  showConsentCheckbox: config.showConsentCheckbox ?? false,
  termsConsentText: config.termsConsentText || '',
  requireSecondConsent: config.requireSecondConsent ?? false,
  secondConsentText: config.secondConsentText || '',
  emailOptIn: config.emailOptIn ?? false,
  emailConsentText: config.emailConsentText || '',
  submitButtonText: config.submitButtonText || '',
  linkToStore: config.linkToStore || '',
  linkText: config.linkText || '',
  gridTwoByTwo: config.gridTwoByTwo ?? true,
  showSoldOut: config.showSoldOut ?? true,
});

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

    const config = mapCampaignConfig(data.config || {});

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      welcomeMessage: data.welcome_message,
      brandColor: data.brand_color,
      ...config,
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
    const config = buildConfigFromCampaignData(campaignData);
    const payload = {
      name: campaignData.name,
      slug: campaignData.slug,
      welcome_message: campaignData.welcomeMessage,
      brand_color: campaignData.brandColor,
      config,
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
