import React, { useMemo, useState, useEffect } from 'react';
import {
  Layout, Package, Palette, Settings, ChevronRight, ChevronLeft,
  Info, Plus, Home, Users, Copy, ExternalLink, Download,
  AlertTriangle, CheckCircle, XCircle, Search, Filter,
  Loader2, Shield, MapPin, ShoppingCart, DollarSign, Globe, FileText,
  Signal, Wifi, Battery
} from 'lucide-react';
import { googleAddressService } from './services/googleAddressService';
/**
 * ==========================================
 * SECTION 1: SUPABASE CLIENT (MOCKED FOR PREVIEW)
 * * NOTE FOR LOCAL DEVELOPMENT:
 * 1. Run `npm install @supabase/supabase-js`
 * 2. Uncomment the import below
 * 3. Replace the MockClient with the real createClient
 * ==========================================
 */

import { createClient } from '@supabase/supabase-js'; // <--- UNCOMMENT THIS LOCALLY

// --- INITIALIZE CLIENT ---
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_KEY
);

/**
 * ==========================================
 * SECTION 3: CAMPAIGN SERVICE (Logic)
 * (Move to src/services/campaignService.js locally)
 * ==========================================
 */
const PRODUCT_CATALOG = [
  { id: 'p1', title: 'Vintage Leather Jacket', price: 650, image: 'https://images.unsplash.com/photo-1551028919-ac669d6301dd?auto=format&fit=crop&q=80&w=300' },
  { id: 'p2', title: 'Performance Energy Drink', price: 45, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300' },
  { id: 'p3', title: 'Hydrating Face Cream', price: 120, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300' },
  { id: 'p4', title: 'Ceramic Diffuser', price: 55, image: 'https://images.unsplash.com/photo-1616486029423-aaa478965c97?auto=format&fit=crop&q=80&w=300' },
  { id: 'p5', title: 'Silk Pillowcase', price: 85, image: 'https://images.unsplash.com/photo-1576014131795-d4c3a283033f?auto=format&fit=crop&q=80&w=300' },
  { id: 'p6', title: 'Matcha Kit (Sold Out)', price: 40, image: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&q=80&w=300' },
];

const campaignService = {
  // INFLUENCER VIEW: Fetch a campaign by its public link (slug)
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
      selectedProductIds: data.selected_product_ids || [], 
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
      gridTwoByTwo: true,
      showSoldOut: true,
      linkToStore: data.link_to_store,
      linkText: data.link_text
    };
  },

  // ADMIN DASHBOARD: Fetch all campaigns
  async getAllCampaigns() {
    // Note: The mock .order() implementation returns a thenable, so await works
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
    return data;
  },

  // ADMIN BUILDER: Create a new campaign
  async createCampaign(campaignData) {
    const payload = {
      name: campaignData.name,
      slug: campaignData.slug,
      welcome_message: campaignData.welcomeMessage,
      brand_color: campaignData.brandColor,
      selected_product_ids: campaignData.selectedProductIds,
      item_limit: campaignData.itemLimit || 1,
      order_limit_per_link: campaignData.orderLimitPerLink ? parseInt(campaignData.orderLimitPerLink) : null,
      max_cart_value: campaignData.maxCartValue ? parseFloat(campaignData.maxCartValue) : null,
      block_duplicate_orders: campaignData.blockDuplicateOrders,
      shipping_zone: campaignData.shippingZone,
      restricted_countries: campaignData.restrictedCountries,
      show_phone_field: campaignData.requirePhone,
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

  // INFLUENCER ACTION: Submit an order
  async createOrder(orderData) {
    const { campaignId, items, ...customerInfo } = orderData;

    const payload = {
      campaign_id: campaignId,
      influencer_email: customerInfo.email,
      influencer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
      influencer_handle: customerInfo.instagram || customerInfo.tiktok || '',
      shipping_address: customerInfo.address,
      items: items, 
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

  getProducts() {
    return PRODUCT_CATALOG;
  }
};

const AnalyticsService = {
  calculateStats: (orders) => {
    const totalValue = orders.reduce((acc, ord) => acc + (ord.amount || 0), 0);
    const fulfilled = orders.filter(o => o.status === 'fulfilled').length;
    const pending = orders.filter(o => o.status === 'unfulfilled').length;
    return { totalValue, totalOrders: orders.length, fulfilled, pending };
  }
};

/**
 * ==========================================
 * SECTION 4: UI COMPONENTS & APP
 * ==========================================
 */

// --- MOCK DATA FOR ORDERS (Since we don't have real orders yet) ---
const MOCK_ORDERS = [
  { id: 'ord_1', shopifyId: '5968489152595', date: '2025-12-14T11:47:00', influencer: 'Demo Last', handle: '@demo.last', status: 'unfulfilled', campaign: 'Summer Seeding', amount: 2629.95, items: 3, risk: 'low' },
  { id: 'ord_2', shopifyId: '5968489152596', date: '2025-12-14T12:48:00', influencer: 'Sarah Jenks', handle: '@sarahj', status: 'fulfilled', campaign: 'Summer Seeding', amount: 120.00, items: 1, risk: 'low' },
];

const SHIPPING_ZONES = ["United States", "Canada", "United Kingdom", "Australia", "Germany"];

const Toggle = ({ enabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
      enabled ? 'bg-indigo-600' : 'bg-gray-200'
    }`}
  >
    <span className="sr-only">{label}</span>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const RuleSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
      <Icon size={16} className="text-indigo-600" />
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</span>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const RuleToggle = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center gap-2 mr-4">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {description && (
        <div className="group relative flex items-center">
          <Info size={14} className="text-gray-400 hover:text-indigo-600 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
            {description}
          </div>
        </div>
      )}
    </div>
    <Toggle enabled={enabled} onChange={onChange} label={label} />
  </div>
);

/* --- CLAIM EXPERIENCE --- */
const ClaimExperience = ({ campaign, products, isPreview = false, onSubmit }) => {
  const [step, setStep] = useState('selection');
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', instagram: '', address: '' 
  });
  
  // NEW: Store clean address data from Google (Zip, City, Country)
  const [structuredAddress, setStructuredAddress] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Address Search State
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);

  // Address Search Handler (Google API)
  useEffect(() => {
    if (addressQuery.length > 2) {
      const timeoutId = setTimeout(async () => {
        try {
          // CHANGED: Use real Google service
          const results = await googleAddressService.searchAddresses(addressQuery);
          setAddressSuggestions(results);
        } catch (e) {
          console.error("Google Maps Error", e);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setAddressSuggestions([]);
    }
  }, [addressQuery]);

  const availableProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => campaign.selectedProductIds?.includes(p.id));
  }, [products, campaign]);

  // RULE: Enforce Item Limit
  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(pid => pid !== id));
    } else {
      const limit = campaign.itemLimit || 1;
      if (selectedIds.length >= limit) {
        // Optional: You could show a toast here like "You can only choose 1 item"
        return; 
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // RULE: Handle Address Selection & Country Validation
  const handleAddressSelect = async (addr) => {
    // UI Updates
    setFormData(p => ({...p, address: addr.label}));
    setAddressQuery(addr.label);
    setAddressSuggestions([]);
    setError(null);

    if (isPreview) return;

    try {
      // Fetch details (Zip, City, Country)
      const details = await googleAddressService.getPlaceDetails(addr.id);
      setStructuredAddress(details);
      
      // VALIDATION: Check Shipping Zone
      // Example: If campaign is "United States" but user picked "Canada"
      if (campaign.shippingZone && campaign.shippingZone !== 'World' && details.country !== campaign.shippingZone) {
        setError(`Sorry, this campaign is only available in ${campaign.shippingZone}.`);
        setStructuredAddress(null); // Invalid address
      }
    } catch (e) {
      console.error("Failed to get address details", e);
    }
  };

  const handleClaim = async () => {
    if (isPreview) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.email || !formData.address) throw new Error("Email and Address are required.");
      if (error) throw new Error("Please fix the errors before continuing.");

      const selectedItems = products.filter(p => selectedIds.includes(p.id));
      
      const orderPayload = {
        campaignId: campaign.id,
        items: selectedItems,
        ...formData,
        shippingDetails: structuredAddress // Save the clean data
      };

      // Call the REAL Service
      await campaignService.createOrder(orderPayload);
      
      if (onSubmit) onSubmit(campaign.id);
      setStep('success');
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <Package size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-gray-500 text-sm">Your gifts are on the way.</p>
      </div>
    );
  }

  // PRODUCT GRID
  if (step === 'selection') {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 pb-2 text-center">
            {campaign.brandLogo ? (
              <div className="h-8 w-20 mx-auto bg-gray-200 rounded animate-pulse" />
            ) : (
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: campaign.brandColor }}>
                YOUR BRAND
              </div>
            )}
            <div className="inline-flex px-3 py-1 bg-gray-100 rounded-full text-[10px] font-medium mb-3">Hello, Creator</div>
            <h1 className="text-xl font-medium text-gray-900 leading-tight">{campaign.welcomeMessage}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide">
            {availableProducts.length === 0 ? (
               <div className="py-10 text-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                 No products available.
               </div>
            ) : (
            <div className={`grid gap-3 ${campaign.gridTwoByTwo ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {availableProducts.map(p => {
                const isSelected = selectedIds.includes(p.id);
                // Visual feedback if disabled (limit reached and not selected)
                const isLimitReached = selectedIds.length >= (campaign.itemLimit || 1);
                const isDisabled = isLimitReached && !isSelected;

                return (
                  <div 
                    key={p.id} 
                    onClick={() => toggleSelection(p.id)}
                    className={`group relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-offset-2' : ''} ${isDisabled ? 'opacity-50' : ''}`}
                    style={{ ringColor: isSelected ? campaign.brandColor : 'transparent' }}
                  >
                    <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-2 relative">
                      <img src={p.image} className="w-full h-full object-cover" alt={p.title} />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                          <div className="bg-white rounded-full p-1 shadow-sm">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: campaign.brandColor }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-1">
                      <div className="text-xs font-medium text-gray-900 truncate">{p.title}</div>
                      <div className="text-[10px] text-gray-400 line-through">${p.price}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white/90 backdrop-blur-sm sticky bottom-0">
          <button
            onClick={() => setStep('details')}
            disabled={selectedIds.length === 0}
            className="w-full h-12 rounded-full text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: campaign.brandColor }}
          >
            Claim {selectedIds.length > 0 ? `${selectedIds.length} Gift${selectedIds.length > 1 ? 's' : ''}` : 'Gifts'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // FORM DETAILS
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white z-10">
        <button onClick={() => setStep('selection')} className="p-2 hover:bg-gray-50 rounded-full">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-900">Shipping Details</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="First name" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            value={formData.firstName} onChange={e => setFormData(p => ({...p, firstName: e.target.value}))} />
          <input placeholder="Last name" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            value={formData.lastName} onChange={e => setFormData(p => ({...p, lastName: e.target.value}))} />
        </div>
        <input placeholder="Email address" type="email" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} />
        
        {campaign.showInstagramField && (
           <input placeholder="@instagram" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             value={formData.instagram} onChange={e => setFormData(p => ({...p, instagram: e.target.value}))} />
        )}

        <div className="relative">
            <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input 
              placeholder="Search address..." 
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={addressQuery}
              onChange={e => {
                setAddressQuery(e.target.value);
                setFormData(p => ({...p, address: e.target.value}));
                // Reset structured data if user types manually
                if (structuredAddress) setStructuredAddress(null);
              }}
            />
            {addressSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {addressSuggestions.map(addr => (
                  <div 
                    key={addr.id}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                    onClick={() => handleAddressSelect(addr)} // CHANGED to new handler
                  >
                    {addr.label}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleClaim}
          disabled={isSubmitting || !!error}
          className="w-full h-12 rounded-full text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: campaign.brandColor }}
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (campaign.submitButtonText || 'Confirm & Ship')}
        </button>
      </div>
    </div>
  );
};

/* --- ORDERS DASHBOARD (Improved with AnalyticsService) --- */
const OrdersDashboard = ({ onNavigateDashboard }) => {
  const stats = useMemo(() => AnalyticsService.calculateStats(MOCK_ORDERS), []);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs mr-2">A</div>
          <span className="font-semibold text-gray-900 tracking-tight">Admin</span>
        </div>
        <div className="p-4 space-y-1">
          <button onClick={onNavigateDashboard} className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            <Home size={18} /> Dashboard
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg">
            <Package size={18} /> Orders
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        </header>

        <main className="p-8 max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><DollarSign size={14}/> Total Gifted Value</p>
              <div className="mt-2 text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><Package size={14}/> Total Orders</p>
              <div className="mt-2 text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><CheckCircle size={14}/> Fulfilled</p>
               <div className="mt-2 text-2xl font-bold text-green-600">{stats.fulfilled}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><AlertTriangle size={14}/> Action Needed</p>
               <div className="mt-2 text-2xl font-bold text-orange-600">{stats.pending}</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders (Mock)</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Influencer</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_ORDERS.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-indigo-600">#{order.shopifyId.slice(-4)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">{order.influencer}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'fulfilled' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 text-sm">${order.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

/* --- CAMPAIGN DASHBOARD --- */
const DashboardHome = ({ campaigns, onCreateCampaign, onDeleteCampaign, onViewOrders }) => {
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs mr-2">A</div>
          <span className="font-semibold text-gray-900 tracking-tight">Admin</span>
        </div>
        <div className="p-4 space-y-1">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"><Home size={18} /> Dashboard</button>
          <button onClick={onViewOrders} className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"><Package size={18} /> Orders</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
          <button onClick={onCreateCampaign} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm">
            <Plus size={16} /> New Campaign
          </button>
        </header>
        <main className="p-8 max-w-6xl mx-auto space-y-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400"><Package size={20} /></div>
                <h3 className="text-sm font-medium text-gray-900">No campaigns yet</h3>
                <button onClick={onCreateCampaign} className="text-sm font-medium text-indigo-600 hover:underline mt-2">Create Link</button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Campaign</th>
                    <th className="px-6 py-3">Link</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Claims</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4">
                        <a href={`#claim/${c.slug}`} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:text-indigo-600">gift.app/{c.slug}</a>
                      </td>
                      <td className="px-6 py-4"><span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span></td>
                      <td className="px-6 py-4 text-right font-mono text-gray-600">{c.claims_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

/* --- CAMPAIGN BUILDER (Restored Full Functionality) --- */
const CampaignBuilder = ({ onPublish, onCancel }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState({
    name: 'Summer Influencer Seeding',
    slug: 'summer-seeding',
    welcomeMessage: 'Hey! We love your content. Here is a gift on us.',
    requirePhone: false,
    selectedProductIds: ['p1', 'p3'],
    brandColor: '#4f46e5',
    brandLogo: null,
    itemLimit: 1,
    shippingZone: 'United States',
    restrictedCountries: '',
    
    // Limits
    orderLimitPerLink: '',
    maxCartValue: '',
    blockDuplicateOrders: false,

    // Contact
    showPhoneField: false,
    showInstagramField: true,
    showTiktokField: false,
    askCustomQuestion: false,
    customQuestionLabel: '',
    customQuestionRequired: false,

    // Product Settings
    showSoldOut: true,
    hideInactiveProducts: true,
    allowQuantitySelector: false,
    linkToStore: '',
    linkText: '',
    gridTwoByTwo: true,

    // Content & Consent
    showConsentCheckbox: true,
    termsConsentText: '',
    requireSecondConsent: false,
    secondConsentText: '',
    emailOptIn: true,
    emailConsentText: '',
    submitButtonText: '',

    // Order Processing
    orderTags: '',
    customerTags: '',
    discountCode: 'INFLUENCERGIFT',
    keepDraft: false,
    enableBilling: false,
  });

  // Get products from service
  const products = campaignService.getProducts();

  const updateField = (field, val) => setData(p => ({ ...p, [field]: val }));
  
  const toggleProduct = (id) => {
    setData(prev => {
      const current = prev.selectedProductIds;
      return {
        ...prev,
        selectedProductIds: current.includes(id) ? current.filter(p => p !== id) : [...current, id]
      };
    });
  };

  const handlePublish = async () => {
    setIsSaving(true);
    
    // 1. Generate a base slug from the CURRENT name
    const baseSlug = data.name.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/[\s_-]+/g, '-'); // Replace spaces with dashes

    // 2. Append a random timestamp to GUARANTEE uniqueness
    // Example: "summer-seeding-1715629"
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
    
    try {
      // 3. Send the uniqueSlug instead of data.slug
      await campaignService.createCampaign({ 
        ...data, 
        slug: uniqueSlug 
      });
      
      onPublish(); 
    } catch (e) {
      console.error("Failed to publish", e);
      alert(`Error publishing campaign: ${e.message || "Unknown error"}. Check console.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Tab Button Helper
  const TabBtn = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        activeTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {/* Editor Panel */}
      <div className="w-full md:w-1/2 flex flex-col h-full bg-white border-r border-gray-200 z-10">
        <div className="h-16 px-8 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-md"><ChevronLeft size={20}/></button>
            <span className="font-semibold text-gray-900">New Campaign</span>
          </div>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Save Draft</button>
        </div>

        <div className="px-8 py-6 border-b border-gray-100 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <TabBtn id="details" icon={Layout} label="Details" />
            <TabBtn id="products" icon={Package} label="Products" />
            <TabBtn id="branding" icon={Palette} label="Branding" />
            <TabBtn id="rules" icon={Settings} label="Rules" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          <div className="max-w-xl mx-auto space-y-8">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                  <input 
                    value={data.name} onChange={e => updateField('name', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
                  <textarea 
                    value={data.welcomeMessage} onChange={e => updateField('welcomeMessage', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center gap-4">
                      <img src={p.image} className="w-12 h-12 rounded-md object-cover bg-gray-100" />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{p.title}</h4>
                        <p className="text-xs text-gray-500">${p.price}.00</p>
                      </div>
                    </div>
                    <Toggle enabled={data.selectedProductIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Brand Color</label>
                  <div className="flex gap-4">
                    <input type="color" value={data.brandColor} onChange={e => updateField('brandColor', e.target.value)} className="h-10 w-10 p-1 rounded border" />
                    <input type="text" value={data.brandColor} onChange={e => updateField('brandColor', e.target.value)} className="flex-1 px-4 rounded-lg border" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-6">
                <RuleSection title="General Limits" icon={ShoppingCart}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Item Limit</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Max items an influencer can select per order.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input type="number" min="1" max="10" value={data.itemLimit} onChange={e => updateField('itemLimit', parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Order Limit per Link</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Total number of orders allowed for this campaign link.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input type="number" value={data.orderLimitPerLink} onChange={e => updateField('orderLimitPerLink', e.target.value)} placeholder="Unlimited" className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Max Cart Value ($)</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Maximum total retail value allowed in the cart.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input type="number" value={data.maxCartValue} onChange={e => updateField('maxCartValue', e.target.value)} placeholder="No Limit" className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <RuleToggle 
                      label="Block Duplicate Orders" 
                      description="Prevent the same person (email/handle) from ordering more than once."
                      enabled={data.blockDuplicateOrders} 
                      onChange={v => updateField('blockDuplicateOrders', v)} 
                    />
                  </div>
                </RuleSection>

                <RuleSection title="Contact Fields" icon={Users}>
                  <RuleToggle label="Show Phone Field" description="Ask for phone number during checkout." enabled={data.requirePhone} onChange={v => updateField('requirePhone', v)} />
                  <RuleToggle label="Show Instagram" description="Ask for Instagram handle." enabled={data.showInstagramField} onChange={v => updateField('showInstagramField', v)} />
                  <RuleToggle label="Show TikTok" description="Ask for TikTok handle." enabled={data.showTiktokField} onChange={v => updateField('showTiktokField', v)} />
                  
                  <div className="pt-2 border-t border-gray-100">
                    <RuleToggle label="Ask Custom Question" description="Add a custom text field to the form." enabled={data.askCustomQuestion} onChange={v => updateField('askCustomQuestion', v)} />
                    {data.askCustomQuestion && (
                      <div className="pl-4 mt-2 space-y-2 border-l-2 border-indigo-100">
                        <input 
                          placeholder="e.g. What is your shirt size?" 
                          className="w-full px-3 py-2 text-sm rounded-lg border" 
                          value={data.customQuestionLabel}
                          onChange={e => updateField('customQuestionLabel', e.target.value)}
                        />
                        <RuleToggle label="Required?" description="Is this question mandatory?" enabled={data.customQuestionRequired} onChange={v => updateField('customQuestionRequired', v)} />
                      </div>
                    )}
                  </div>
                </RuleSection>

                <RuleSection title="Content & Consent" icon={Shield}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Terms Consent Text</label>
                    <textarea rows={2} className="w-full px-3 py-2 rounded-lg border text-sm" value={data.termsConsentText} onChange={e => updateField('termsConsentText', e.target.value)} placeholder="I consent to..." />
                  </div>
                  
                  <div className="pt-3">
                    <RuleToggle label="Require Second Consent" description="Add an additional mandatory checkbox." enabled={data.requireSecondConsent} onChange={v => updateField('requireSecondConsent', v)} />
                    {data.requireSecondConsent && (
                      <textarea rows={2} className="w-full mt-2 px-3 py-2 rounded-lg border text-sm" value={data.secondConsentText} onChange={e => updateField('secondConsentText', e.target.value)} placeholder="Additional consent text..." />
                    )}
                  </div>

                  <div className="pt-3">
                    <RuleToggle label="Email Subscription Opt-in" description="Show a checkbox to subscribe to marketing emails." enabled={data.emailOptIn} onChange={v => updateField('emailOptIn', v)} />
                    {data.emailOptIn && (
                      <input className="w-full mt-2 px-3 py-2 rounded-lg border text-sm" value={data.emailConsentText} onChange={e => updateField('emailConsentText', e.target.value)} placeholder="Subscribe to emails text..." />
                    )}
                  </div>

                  <div className="pt-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Submit Button Text</label>
                    <input className="w-full px-3 py-2 rounded-lg border text-sm" value={data.submitButtonText} onChange={e => updateField('submitButtonText', e.target.value)} placeholder="Confirm & Ship" />
                  </div>
                </RuleSection>

                <RuleSection title="Product Settings" icon={Package}>
                    <RuleToggle label="2x2 Grid View" description="Display products in a 2-column grid instead of a list." enabled={data.gridTwoByTwo} onChange={v => updateField('gridTwoByTwo', v)} />
                    <RuleToggle label="Show Sold Out" description="Display out-of-stock items as disabled." enabled={data.showSoldOut} onChange={v => updateField('showSoldOut', v)} />
                    <RuleToggle label="Hide Inactive" description="Hide products that are archived in Shopify." enabled={data.hideInactiveProducts} onChange={v => updateField('hideInactiveProducts', v)} />
                    
                    <div className="pt-3 border-t border-gray-100">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Link to Store</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="px-3 py-2 rounded-lg border text-sm" placeholder="myshop.com" value={data.linkToStore} onChange={e => updateField('linkToStore', e.target.value)} />
                        <input className="px-3 py-2 rounded-lg border text-sm" placeholder="Link Text" value={data.linkText} onChange={e => updateField('linkText', e.target.value)} />
                      </div>
                    </div>
                </RuleSection>

                <RuleSection title="Shipping" icon={Globe}>
                    <div className="relative">
                      <select 
                        value={data.shippingZone}
                        onChange={(e) => updateField('shippingZone', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                      >
                        {SHIPPING_ZONES.map(zone => (
                          <option key={zone}>{zone}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-2.5 pointer-events-none text-gray-500">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Restricted Countries</label>
                      <input className="w-full px-3 py-2 rounded-lg border text-sm" placeholder="Russia, North Korea..." value={data.restrictedCountries} onChange={e => updateField('restrictedCountries', e.target.value)} />
                    </div>
                </RuleSection>

                {/* Order Processing Section (Moved to Bottom) */}
                <RuleSection title="Order Processing" icon={FileText}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Tag Orders</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Tags added to the Shopify Order for filtering/automation.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input 
                        placeholder="e.g. summer-gift" 
                        className="w-full px-3 py-2 text-sm rounded-lg border" 
                        value={data.orderTags}
                        onChange={e => updateField('orderTags', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Tag Customers</label>
                        <div className="group relative flex items-center">
                          <Info size={12} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                            Tags added to the Shopify Customer profile for segmentation.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <input 
                        placeholder="e.g. influencer" 
                        className="w-full px-3 py-2 text-sm rounded-lg border" 
                        value={data.customerTags}
                        onChange={e => updateField('customerTags', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Discount Code</label>
                      <input 
                        placeholder="INFLUENCER100" 
                        className="w-full px-3 py-2 text-sm rounded-lg border" 
                        value={data.discountCode}
                        onChange={e => updateField('discountCode', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <RuleToggle 
                      label="Keep Order in Draft" 
                      description="Requires manual approval in Shopify before fulfilling."
                      enabled={data.keepDraft} 
                      onChange={v => updateField('keepDraft', v)} 
                    />
                    <RuleToggle 
                      label="Enable Billing Address" 
                      description="Collect billing details from influencer (usually not needed)."
                      enabled={data.enableBilling} 
                      onChange={v => updateField('enableBilling', v)} 
                    />
                  </div>
                </RuleSection>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handlePublish} disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {isSaving ? 'Publishing...' : 'Publish Campaign'}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="hidden md:flex flex-1 bg-gray-100 flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#d4d4ff 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
        <div className="relative w-[320px] h-[640px] z-10">
          <div className="absolute inset-0 rounded-[48px] bg-slate-900 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.8)]"></div>
          <div className="absolute inset-[10px] rounded-[40px] bg-white overflow-hidden flex flex-col">
            <div className="h-10 px-5 flex items-center justify-between text-[11px] text-gray-600">
              <span>9:41</span>
              <div className="flex gap-1"><Signal size={12} /><Wifi size={12} /><Battery size={12} /></div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <ClaimExperience campaign={data} products={products} isPreview={true} />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-slate-800 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- MAIN APP ORCHESTRATOR --- */
export default function App() {
  const [route, setRoute] = useState(typeof window !== 'undefined' ? window.location.hash : '');
  const [campaigns, setCampaigns] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Initial Load from Supabase
  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await campaignService.getAllCampaigns();
      setCampaigns(data || []);
    } catch (e) {
      console.error("Failed to load campaigns", e);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  // --- ROUTER: PUBLIC CLAIM PAGE ---
  if (route.startsWith('#claim/')) {
    const slug = route.split('#claim/')[1];
    
    // We need a separate state here because we need to fetch the single campaign async
    // This is a simple implementation; normally you'd use a useEffect to fetch by slug
    return <PublicClaimLoader slug={slug} />;
  }
  
  if (route === '#create') {
    return <CampaignBuilder onPublish={() => { loadCampaigns(); window.location.hash = ''; }} onCancel={() => window.location.hash = ''} />;
  }
  
  if (view === 'orders') return <OrdersDashboard onNavigateDashboard={() => setView('dashboard')} />;
  
  return <DashboardHome campaigns={campaigns} onCreateCampaign={() => window.location.hash = '#create'} onViewOrders={() => setView('orders')} />;
}

// Helper component to load a single campaign for the public view
const PublicClaimLoader = ({ slug }) => {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const products = campaignService.getProducts();

  useEffect(() => {
    const fetch = async () => {
      const data = await campaignService.getCampaignBySlug(slug);
      setCampaign(data);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!campaign) return <div className="h-screen flex items-center justify-center text-gray-500">Campaign not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-white h-[800px] max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden relative">
        <ClaimExperience campaign={campaign} products={products} />
      </div>
    </div>
  );
};