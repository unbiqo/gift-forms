import React, { useMemo, useState, useEffect } from 'react';
import {
  Layout,
  Package,
  Palette,
  Settings,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  Upload,
  Info,
  Battery,
  Wifi,
  Signal,
  Plus,
  Home,
  Users,
  Copy,
  MoreHorizontal,
  Globe,
  Shield,
  ShoppingCart,
  Eye,
  MapPin,
  Trash2,
  ExternalLink,
  Download,
  Link as LinkIcon,
  MessageSquare
} from 'lucide-react';

/**
 * --- UTILITIES & HELPERS ---
 */

const generateSlug = (name) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${Math.random().toString(36).substring(2, 6)}`;
};

const STORAGE_KEY = 'campaign_mvp_data';
const db = {
  get: () => {
    try {
      if (typeof window === 'undefined') return [];
      const data = window.localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Storage access failed', e);
      return [];
    }
  },
  save: (campaigns) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
      }
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  },
  add: (campaign) => {
    const current = db.get();
    const newCampaign = { 
      ...campaign, 
      id: crypto.randomUUID(), 
      createdAt: new Date().toISOString(),
      status: 'active',
      claims: 0
    };
    const updated = [newCampaign, ...current];
    db.save(updated);
    return newCampaign;
  },
  delete: (id) => {
    const current = db.get();
    const updated = current.filter(c => c.id !== id);
    db.save(updated);
    return updated;
  },
  incrementClaims: (id) => {
    const current = db.get();
    const updated = current.map(c => 
      c.id === id ? { ...c, claims: (c.claims || 0) + 1 } : c
    );
    db.save(updated);
    return updated;
  }
};

// Form Sanitizers
const sanitizeName = (val) => val.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 40);
const sanitizeEmail = (val) => val.replace(/[^\w.@+-]/g, '').slice(0, 60);
const sanitizeHandle = (val) => {
  const cleaned = val.replace(/[^a-zA-Z0-9._]/g, '').replace(/^@+/, '');
  return cleaned ? `@${cleaned}` : '';
};
const sanitizePhone = (val) => val.replace(/\D/g, '').slice(0, 15);

// Mock Data
const MOCK_PRODUCTS = [
  { id: 'p1', title: 'Vintage Leather Jacket', price: 650, image: 'https://images.unsplash.com/photo-1551028919-ac669d6301dd?auto=format&fit=crop&q=80&w=300' },
  { id: 'p2', title: 'Performance Energy Drink', price: 45, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300' },
  { id: 'p3', title: 'Hydrating Face Cream', price: 120, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300' },
  { id: 'p4', title: 'Ceramic Diffuser', price: 55, image: 'https://images.unsplash.com/photo-1616486029423-aaa478965c97?auto=format&fit=crop&q=80&w=300' },
  { id: 'p5', title: 'Silk Pillowcase', price: 85, image: 'https://images.unsplash.com/photo-1576014131795-d4c3a283033f?auto=format&fit=crop&q=80&w=300' },
  { id: 'p6', title: 'Matcha Kit', price: 40, image: 'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&q=80&w=300' },
];

const SHIPPING_ZONES = ["United States", "Canada", "United Kingdom", "Australia", "Germany"];

/**
 * --- SHARED COMPONENTS ---
 */

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
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
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
  <div className="flex items-center justify-between">
    <div className="mr-4">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    <Toggle enabled={enabled} onChange={onChange} label={label} />
  </div>
);

/**
 * --- CLAIM EXPERIENCE COMPONENT ---
 */
const ClaimExperience = ({ campaign, products, isPreview = false, onSubmit }) => {
  const [step, setStep] = useState('selection');
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', instagram: '', tiktok: '', address: '',
    customAnswer: '' 
  });
  
  const availableProducts = useMemo(() => {
    return products.filter(p => campaign.selectedProductIds.includes(p.id));
  }, [products, campaign]);

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(pid => pid !== id));
    } else {
      if (selectedIds.length >= campaign.itemLimit) return;
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleClaim = () => {
    if (isPreview) return;
    if (onSubmit) onSubmit(campaign.id);
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <Package size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-gray-500 text-sm">Your gifts are on the way. Check your email for tracking.</p>
        
        {campaign.linkToStore && (
          <a 
            href={`https://${campaign.linkToStore}`} 
            target="_blank" 
            rel="noreferrer"
            className="mt-8 text-indigo-600 text-sm font-medium hover:underline flex items-center gap-1"
          >
            {campaign.linkText || 'Visit our Store'} <ExternalLink size={14} />
          </a>
        )}
      </div>
    );
  }

  // --- RENDER: PRODUCT GRID ---
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
            <div className="inline-flex px-3 py-1 bg-gray-100 rounded-full text-[10px] font-medium mb-3">
              Hello, Creator
            </div>
            <h1 className="text-xl font-medium text-gray-900 leading-tight">
              {campaign.welcomeMessage}
            </h1>
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
                return (
                  <div 
                    key={p.id} 
                    onClick={() => toggleSelection(p.id)}
                    className={`group relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ ringColor: isSelected ? campaign.brandColor : 'transparent' }}
                  >
                    <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-2 relative">
                      <img src={p.image} className="w-full h-full object-cover" alt={p.title} />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                          <div className="bg-white rounded-full p-1 shadow-sm">
                            <div className="w-4 h-4 bg-indigo-600 rounded-full" style={{ backgroundColor: campaign.brandColor }} />
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

  // --- RENDER: DETAILS FORM ---
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white z-10">
        <button onClick={() => setStep('selection')} className="p-2 hover:bg-gray-50 rounded-full">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-900">Shipping Details</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input 
            placeholder="First name" 
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.firstName}
            onChange={e => setFormData(prev => ({...prev, firstName: sanitizeName(e.target.value)}))}
          />
          <input 
            placeholder="Last name" 
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.lastName}
            onChange={e => setFormData(prev => ({...prev, lastName: sanitizeName(e.target.value)}))}
          />
        </div>
        <input 
          placeholder="Email address" 
          type="email"
          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          value={formData.email}
          onChange={e => setFormData(prev => ({...prev, email: sanitizeEmail(e.target.value)}))}
        />
        
        {campaign.requirePhone && (
          <input 
            placeholder="Phone number" 
            type="tel"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.phone}
            onChange={e => setFormData(prev => ({...prev, phone: sanitizePhone(e.target.value)}))}
          />
        )}

        {(campaign.showInstagramField || campaign.showTiktokField) && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {campaign.showInstagramField && (
              <input 
                placeholder="@instagram" 
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.instagram}
                onChange={e => setFormData(prev => ({...prev, instagram: sanitizeHandle(e.target.value)}))}
              />
            )}
            {campaign.showTiktokField && (
              <input 
                placeholder="@tiktok" 
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.tiktok}
                onChange={e => setFormData(prev => ({...prev, tiktok: sanitizeHandle(e.target.value)}))}
              />
            )}
          </div>
        )}

        {/* Custom Question */}
        {campaign.askCustomQuestion && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {campaign.customQuestionLabel || 'Additional Question'}
              {campaign.customQuestionRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input 
              placeholder="Your answer..." 
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.customAnswer}
              onChange={e => setFormData(prev => ({...prev, customAnswer: e.target.value}))}
            />
          </div>
        )}

        <div className="pt-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Shipping Address</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input 
              placeholder="Search address..." 
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.address}
              onChange={e => setFormData(prev => ({...prev, address: e.target.value}))}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Main Consent */}
          {campaign.showConsentCheckbox && (
            <label className="flex gap-3 items-start cursor-pointer group">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                {campaign.termsConsentText || "I agree to the terms and conditions."}
              </span>
            </label>
          )}

          {/* Second Consent */}
          {campaign.requireSecondConsent && (
            <label className="flex gap-3 items-start cursor-pointer group">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                {campaign.secondConsentText || "Additional consent required."}
              </span>
            </label>
          )}

          {/* Email Opt-in */}
          {campaign.emailOptIn && (
            <label className="flex gap-3 items-start cursor-pointer group">
              <input type="checkbox" defaultChecked className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                {campaign.emailConsentText || "Subscribe to email updates"}
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleClaim}
          className="w-full h-12 rounded-full text-white font-semibold text-sm shadow-lg"
          style={{ backgroundColor: campaign.brandColor }}
        >
          {campaign.submitButtonText || 'Confirm & Ship'}
        </button>
      </div>
    </div>
  );
};

/**
 * --- PAGES: ADMIN DASHBOARD ---
 */
const DashboardHome = ({ campaigns, onCreateCampaign, onDeleteCampaign }) => {
  const handleExport = () => {
    const csv = "Name,Slug,Link,Status,Created\n" + campaigns.map(c => 
      `${c.name},${c.slug},gift.app/${c.slug},active,${c.createdAt}`
    ).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs mr-2">A</div>
          <span className="font-semibold text-gray-900 tracking-tight">Admin</span>
        </div>
        <div className="p-4 space-y-1">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg">
            <Home size={18} /> Dashboard
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            <Users size={18} /> Influencers
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            <Package size={18} /> Orders
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
          <button onClick={onCreateCampaign} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all">
            <Plus size={16} /> New Campaign
          </button>
        </header>

        <main className="p-8 max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Active Links</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {campaigns.length} / 5 Forms Created
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <Package size={20} />
                </div>
                <h3 className="text-sm font-medium text-gray-900">No campaigns yet</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Create your first link to start gifting.</p>
                <button onClick={onCreateCampaign} className="text-sm font-medium text-indigo-600 hover:underline">Create Link</button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Campaign Name</th>
                    <th className="px-6 py-3">Public Link</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={`#claim/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          gift.app/{c.slug} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => {
                             navigator.clipboard.writeText(`gift.app/${c.slug}`);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                          title="Copy Link"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteCampaign(c.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
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

/**
 * --- PAGES: CAMPAIGN BUILDER ---
 */
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
  });

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
    await new Promise(r => setTimeout(r, 800)); // Fake API
    const slug = generateSlug(data.name || 'campaign');
    onPublish({ ...data, slug });
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
                {MOCK_PRODUCTS.map(p => (
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
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Item Limit</label>
                      <input type="number" min="1" max="10" value={data.itemLimit} onChange={e => updateField('itemLimit', parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Order Limit per Link</label>
                      <input type="number" value={data.orderLimitPerLink} onChange={e => updateField('orderLimitPerLink', e.target.value)} placeholder="Unlimited" className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Max Cart Value ($)</label>
                      <input type="number" value={data.maxCartValue} onChange={e => updateField('maxCartValue', e.target.value)} placeholder="No Limit" className="w-full px-3 py-2 rounded-lg border" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <RuleToggle label="Block Duplicate Orders" enabled={data.blockDuplicateOrders} onChange={v => updateField('blockDuplicateOrders', v)} />
                  </div>
                </RuleSection>

                <RuleSection title="Contact Fields" icon={Users}>
                  <RuleToggle label="Show Phone Field" enabled={data.requirePhone} onChange={v => updateField('requirePhone', v)} />
                  <RuleToggle label="Show Instagram" enabled={data.showInstagramField} onChange={v => updateField('showInstagramField', v)} />
                  <RuleToggle label="Show TikTok" enabled={data.showTiktokField} onChange={v => updateField('showTiktokField', v)} />
                  
                  <div className="pt-2 border-t border-gray-100">
                    <RuleToggle label="Ask Custom Question" enabled={data.askCustomQuestion} onChange={v => updateField('askCustomQuestion', v)} />
                    {data.askCustomQuestion && (
                      <div className="pl-4 mt-2 space-y-2 border-l-2 border-indigo-100">
                        <input 
                          placeholder="e.g. What is your shirt size?" 
                          className="w-full px-3 py-2 text-sm rounded-lg border" 
                          value={data.customQuestionLabel}
                          onChange={e => updateField('customQuestionLabel', e.target.value)}
                        />
                        <RuleToggle label="Required?" enabled={data.customQuestionRequired} onChange={v => updateField('customQuestionRequired', v)} />
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
                    <RuleToggle label="Require Second Consent" enabled={data.requireSecondConsent} onChange={v => updateField('requireSecondConsent', v)} />
                    {data.requireSecondConsent && (
                      <textarea rows={2} className="w-full mt-2 px-3 py-2 rounded-lg border text-sm" value={data.secondConsentText} onChange={e => updateField('secondConsentText', e.target.value)} placeholder="Additional consent text..." />
                    )}
                  </div>

                  <div className="pt-3">
                    <RuleToggle label="Email Subscription Opt-in" enabled={data.emailOptIn} onChange={v => updateField('emailOptIn', v)} />
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
                   <RuleToggle label="2x2 Grid View" enabled={data.gridTwoByTwo} onChange={v => updateField('gridTwoByTwo', v)} />
                   <RuleToggle label="Show Sold Out" enabled={data.showSoldOut} onChange={v => updateField('showSoldOut', v)} />
                   <RuleToggle label="Hide Inactive" enabled={data.hideInactiveProducts} onChange={v => updateField('hideInactiveProducts', v)} />
                   
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
              <ClaimExperience campaign={data} products={MOCK_PRODUCTS} isPreview={true} />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-slate-800 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * --- PAGES: PUBLIC CLAIM FORM (Standalone) ---
 */
const PublicClaimPage = ({ campaign, onBack, onSubmit }) => {
  if (!campaign) return <div>Campaign not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-white h-[800px] max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative">
        <button 
          onClick={onBack}
          className="absolute top-4 right-4 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
          title="Close Preview"
        >
          <ChevronRight size={16} />
        </button>
        <ClaimExperience campaign={campaign} products={MOCK_PRODUCTS} isPreview={false} onSubmit={onSubmit} />
      </div>
    </div>
  );
};

/**
 * --- MAIN APP ORCHESTRATOR ---
 */
export default function App() {
  const [route, setRoute] = useState(typeof window !== 'undefined' ? window.location.hash : '');
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    // Initial Load
    setCampaigns(db.get());

    // Hash Listener
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleCreate = () => {
    window.location.hash = '#create';
  };
  
  const handlePublish = (data) => {
    const newCampaign = db.add(data);
    setCampaigns(prev => [newCampaign, ...prev]);
    window.location.hash = ''; // Back to dashboard
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      const updated = db.delete(id);
      setCampaigns(updated);
    }
  };

  const handleClaimSubmission = (campaignId) => {
    const updated = db.incrementClaims(campaignId);
    setCampaigns(updated);
  };

  // Router Switch
  if (route.startsWith('#claim/')) {
    const slug = route.split('#claim/')[1];
    const campaign = campaigns.find(c => c.slug === slug);
    return <PublicClaimPage campaign={campaign} onBack={() => window.location.hash = ''} onSubmit={handleClaimSubmission} />;
  }
  
  if (route === '#create') {
     return <CampaignBuilder onPublish={handlePublish} onCancel={() => window.location.hash = ''} />;
  }

  // Default: Dashboard
  return (
    <DashboardHome 
      campaigns={campaigns} 
      onCreateCampaign={handleCreate} 
      onDeleteCampaign={handleDelete}
      onViewCampaign={() => {}} // No longer needed as we use <a> tags
    />
  );
}