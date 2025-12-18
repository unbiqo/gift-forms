import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Layout, Package, Palette, Settings, ChevronRight, ChevronLeft,
  Info, Plus, Home, Users, Copy, ExternalLink, Download,
  AlertTriangle, CheckCircle, XCircle, Search, Filter,
  Loader2, Shield, MapPin, ShoppingCart, DollarSign, Globe, FileText,
  Signal, Wifi, Battery, RefreshCw, ArrowUpDown
} from 'lucide-react';
import { googleAddressService } from './services/googleAddressService';
import { orderService } from './services/orderService';
import { campaignService } from './services/campaignService';

const AnalyticsService = {
  calculateStats: (orders = []) => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return { totalValue: 0, totalOrders: 0, fulfilled: 0, pending: 0 };
    }

    const totalValue = orders.reduce((acc, ord) => acc + (ord.value || ord.amount || 0), 0);
    const fulfilled = orders.filter(o => o.status === 'fulfilled').length;
    const pending = orders.length - fulfilled;

    return { totalValue, totalOrders: orders.length, fulfilled, pending };
  }
};

/**
 * ==========================================
 * SECTION 4: UI COMPONENTS & APP
 * ==========================================
 */

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
  const sanitizeName = (value = '') => value.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 50);
  const sanitizePhone = (value = '') => value.replace(/\D/g, '').slice(0, 15);

  const [step, setStep] = useState('selection');
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    customAnswer: '',
    address: '',
    consentPrimary: false,
    consentSecondary: false
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [structuredAddress, setStructuredAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);

  const showPhoneField = Boolean(campaign.showPhoneField);
  const showInstagramField = Boolean(campaign.showInstagramField);
  const showTiktokField = Boolean(campaign.showTiktokField);
  const askCustomQuestion = Boolean(campaign.askCustomQuestion);
  const customQuestionRequired = Boolean(campaign.customQuestionRequired);
  const showConsentCheckbox = Boolean(campaign.showConsentCheckbox);
  const requireSecondConsent = showConsentCheckbox && Boolean(campaign.requireSecondConsent);

  useEffect(() => {
    if (addressQuery.length > 2) {
      const timeout = setTimeout(async () => {
        try {
          const results = await googleAddressService.searchAddresses(addressQuery);
          setAddressSuggestions(results);
        } catch (err) {
          console.error('Google Maps Error', err);
        }
      }, 300);
      return () => clearTimeout(timeout);
    }
    setAddressSuggestions([]);
  }, [addressQuery]);

  const availableProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => campaign.selectedProductIds?.includes(p.id));
  }, [products, campaign]);

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((pid) => pid !== id));
    } else {
      const limit = campaign.itemLimit || 1;
      if (selectedIds.length >= limit) return;
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleAddressSelect = async (addr) => {
    setFormData((prev) => ({ ...prev, address: addr.label }));
    setAddressQuery(addr.label);
    setAddressSuggestions([]);
    setError(null);

    if (isPreview) return;
    try {
      const details = await googleAddressService.getPlaceDetails(addr.id);
      setStructuredAddress(details);
      if (campaign.shippingZone && campaign.shippingZone !== 'World' && details.country !== campaign.shippingZone) {
        setError(`Sorry, this campaign is only available in ${campaign.shippingZone}.`);
        setStructuredAddress(null);
      }
    } catch (err) {
      console.error('Failed to get address details', err);
    }
  };

  const ensureHandleFormat = (value = '') => {
    if (!value) return '';
    const trimmed = value.trim().replace(/\s+/g, '');
    const withoutLeading = trimmed.replace(/^@+/, '');
    return withoutLeading ? `@${withoutLeading}` : '';
  };

  const hasValidHandle = (value = '') => {
    if (!value) return false;
    const stripped = value.replace(/^@+/, '');
    return Boolean(stripped && /[a-zA-Z0-9]/.test(stripped));
  };

  const validateField = useCallback((field, value) => {
    switch (field) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value || '')) return 'Please enter a valid email address.';
        return '';
      }
      case 'phone': {
        if (!showPhoneField) return '';
        const digits = value || '';
        if (digits.length < 10 || digits.length > 15) return 'Phone number must be 10-15 digits.';
        return '';
      }
      case 'instagram': {
        if (!showInstagramField) return '';
        if (!hasValidHandle(value)) return 'Instagram handle must include letters or numbers.';
        return '';
      }
      case 'tiktok': {
        if (!showTiktokField) return '';
        if (!hasValidHandle(value)) return 'TikTok handle must include letters or numbers.';
        return '';
      }
      default:
        return '';
    }
  }, [showPhoneField, showInstagramField, showTiktokField]);

  const upsertFieldError = (field, value) => {
    const message = validateField(field, value);
    setFieldErrors((prev) => {
      if (!message) {
        if (!(field in prev)) return prev;
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: message };
    });
  };

  const handleFieldChange = (field, rawValue) => {
    let value = rawValue || '';
    if (field === 'firstName' || field === 'lastName') {
      value = sanitizeName(value);
    } else if (field === 'phone') {
      value = sanitizePhone(value);
    } else if (field === 'instagram' || field === 'tiktok') {
      value = ensureHandleFormat(value);
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (['email', 'phone', 'instagram', 'tiktok'].includes(field)) {
      upsertFieldError(field, value);
    }
  };

  const handleBlur = (field) => {
    upsertFieldError(field, formData[field]);
  };

  const forceValidateFields = () => {
    const fieldsToCheck = ['email'];
    if (showPhoneField) fieldsToCheck.push('phone');
    if (showInstagramField) fieldsToCheck.push('instagram');
    if (showTiktokField) fieldsToCheck.push('tiktok');

    const errors = {};
    fieldsToCheck.forEach((field) => {
      const message = validateField(field, formData[field]);
      if (message) errors[field] = message;
    });
    setFieldErrors(errors);
    return errors;
  };

  const isConsentRequired = showConsentCheckbox;
  const consentsSatisfied = !isConsentRequired || (formData.consentPrimary && (!requireSecondConsent || formData.consentSecondary));
  const baseFieldsComplete = Boolean(formData.email && formData.address);
  const contactFieldsComplete = (!showPhoneField || formData.phone.length >= 10) && (!showInstagramField || hasValidHandle(formData.instagram)) && (!showTiktokField || hasValidHandle(formData.tiktok));
  const customAnswered = (!askCustomQuestion || !customQuestionRequired || Boolean(formData.customAnswer?.trim()));
  const hasVisibleErrors = Object.values(fieldErrors).some(Boolean);
  const canSubmit = !isSubmitting && !error && baseFieldsComplete && contactFieldsComplete && customAnswered && consentsSatisfied && !hasVisibleErrors;

  const handleClaim = async () => {
    if (isPreview) return;
    const validationErrors = forceValidateFields();
    if (Object.keys(validationErrors).length > 0 || !consentsSatisfied || !customAnswered || !contactFieldsComplete) {
      setError('Please fix highlighted fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (!formData.email || !formData.address) throw new Error('Email and Address are required.');
      if (showPhoneField && !formData.phone) throw new Error('Phone number is required.');
      if (showInstagramField && !formData.instagram) throw new Error('Instagram handle is required.');
      if (showTiktokField && !formData.tiktok) throw new Error('TikTok handle is required.');
      if (askCustomQuestion && customQuestionRequired && !formData.customAnswer) throw new Error('Please answer the required question.');
      if (showConsentCheckbox && !formData.consentPrimary) throw new Error('Please accept the consent terms.');
      if (requireSecondConsent && !formData.consentSecondary) throw new Error('Please accept the additional consent.');

      const selectedItems = products.filter((p) => selectedIds.includes(p.id));
      const orderPayload = {
        campaignId: campaign.id,
        items: selectedItems,
        ...formData,
        shippingDetails: structuredAddress
      };
      await orderService.createOrder(orderPayload);
      if (onSubmit) onSubmit(campaign.id);
      setStep('success');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTooltip = (message) => {
    if (!message) return null;
    return (
      <div className="absolute right-0 top-full mt-1 z-50 pointer-events-none shadow-lg">
        <div className="relative bg-red-500 text-white text-xs rounded-lg px-2 py-1 tooltip-fade">
          {message}
          <span className="absolute -top-1 right-4 w-2 h-2 bg-red-500 rotate-45" />
        </div>
      </div>
    );
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
              {availableProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const limit = campaign.itemLimit || 1;
                const isDisabled = selectedIds.length >= limit && !isSelected;
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white/90 backdrop-blur-sm sticky bottom-0">
          <button
            onClick={() => setStep('shipping')}
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
          <input
            placeholder="First name"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
          />
          <input
            placeholder="Last name"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
          />
        </div>

        <div className="relative pb-5">
          <input
            placeholder="Email address"
            type="email"
            className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 outline-none ${fieldErrors.email ? 'border border-red-400 focus:ring-red-400' : 'border border-gray-200 focus:ring-indigo-500'}`}
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
          />
          {renderTooltip(fieldErrors.email)}
        </div>

        {showPhoneField && (
          <div className="relative pb-5">
            <input
              placeholder="Phone number"
              type="tel"
              className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 outline-none ${fieldErrors.phone ? 'border border-red-400 focus:ring-red-400' : 'border border-gray-200 focus:ring-indigo-500'}`}
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
            />
            {renderTooltip(fieldErrors.phone)}
          </div>
        )}

        {showInstagramField && (
          <div className="relative pb-5">
            <input
              placeholder="@instagram"
              className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 outline-none ${fieldErrors.instagram ? 'border border-red-400 focus:ring-red-400' : 'border border-gray-200 focus:ring-indigo-500'}`}
              value={formData.instagram}
              onChange={(e) => handleFieldChange('instagram', e.target.value)}
              onBlur={() => handleBlur('instagram')}
            />
            {renderTooltip(fieldErrors.instagram)}
          </div>
        )}

        {showTiktokField && (
          <div className="relative pb-5">
            <input
              placeholder="@tiktok"
              className={`w-full rounded-xl px-3 py-3 text-sm focus:ring-2 outline-none ${fieldErrors.tiktok ? 'border border-red-400 focus:ring-red-400' : 'border border-gray-200 focus:ring-indigo-500'}`}
              value={formData.tiktok}
              onChange={(e) => handleFieldChange('tiktok', e.target.value)}
              onBlur={() => handleBlur('tiktok')}
            />
            {renderTooltip(fieldErrors.tiktok)}
          </div>
        )}

        {askCustomQuestion && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{campaign.customQuestionLabel || 'Additional Details'}</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={3}
              value={formData.customAnswer}
              onChange={(e) => setFormData((prev) => ({ ...prev, customAnswer: e.target.value }))}
            />
          </div>
        )}

        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
          <input
            placeholder="Search address..."
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={addressQuery}
            onChange={(e) => {
              setAddressQuery(e.target.value);
              setFormData((prev) => ({ ...prev, address: e.target.value }));
              if (structuredAddress) setStructuredAddress(null);
            }}
          />
          {addressSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {addressSuggestions.map((addr) => (
                <div
                  key={addr.id}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  onClick={() => handleAddressSelect(addr)}
                >
                  {addr.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {showConsentCheckbox && (
          <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700">Consent</p>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={formData.consentPrimary}
                onChange={(e) => setFormData((prev) => ({ ...prev, consentPrimary: e.target.checked }))}
              />
              <span>{campaign.termsConsentText || 'I agree to the campaign terms.'}</span>
            </label>
            {requireSecondConsent && (
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={formData.consentSecondary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, consentSecondary: e.target.checked }))}
                />
                <span>{campaign.secondConsentText || 'I agree to the additional consent.'}</span>
              </label>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleClaim}
          disabled={!canSubmit}
          className="w-full h-12 rounded-full text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          style={{ backgroundColor: canSubmit ? campaign.brandColor : '#d1d5db' }}
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (campaign.submitButtonText || 'Confirm & Ship')}
        </button>
      </div>
    </div>
  );
};
/* --- ORDERS DASHBOARD (Improved with AnalyticsService) --- */
const OrdersDashboard = ({ onNavigateDashboard }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    campaign: 'all',
    status: 'all',
    consent: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });

  const buildConsentStatus = useCallback((order) => {
    const hasTerms = Boolean(order?.termsConsent);
    const hasMarketing = Boolean(order?.marketingOptIn);
    if (hasTerms && hasMarketing) return 'Fully Consented';
    if (hasTerms) return 'Standard Only';
    return 'No Consent Recorded';
  }, []);

  const stats = useMemo(() => AnalyticsService.calculateStats(orders), [orders]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }), []);
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }), []);

  const campaignOptions = useMemo(() => {
    const names = Array.from(new Set(orders.map(o => o.campaignName).filter(Boolean)));
    return names;
  }, [orders]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(orders.map(o => o.status).filter(Boolean)));
    return statuses;
  }, [orders]);

  const consentOptions = useMemo(() => {
    const consents = Array.from(new Set(orders.map(o => buildConsentStatus(o))));
    return consents;
  }, [orders, buildConsentStatus]);

  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const liveOrders = await orderService.listOrders({ limit: 100 });
      setOrders(liveOrders);
    } catch (err) {
      console.error('Unable to load orders from Supabase', err);
      setError('Unable to load orders right now. Please try again in a moment.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filters.campaign !== 'all' && order.campaignName !== filters.campaign) return false;
      if (filters.status !== 'all' && order.status !== filters.status) return false;
      if (filters.consent !== 'all' && buildConsentStatus(order) !== filters.consent) return false;
      return true;
    });
  }, [orders, filters, buildConsentStatus]);

  const sortedOrders = useMemo(() => {
    const data = [...filteredOrders];
    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    data.sort((a, b) => {
      if (key === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return (dateA - dateB) * multiplier;
      }
      if (key === 'status') {
        return (a.status || '').localeCompare(b.status || '') * multiplier;
      }
      if (key === 'value') {
        const valueA = Number(a.value) || 0;
        const valueB = Number(b.value) || 0;
        return (valueA - valueB) * multiplier;
      }
      return 0;
    });

    return data;
  }, [filteredOrders, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: key === 'date' ? 'desc' : 'asc' };
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return currencyFormatter.format(value);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return dateFormatter.format(new Date(value));
    } catch {
      return value;
    }
  };

  const formatCsvDate = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      const pad = (num) => String(num).padStart(2, '0');
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return value;
    }
  };

  const formatDisplayOrderId = (order) => {
    const external = order.shopifyOrderNumber;
    if (external) return `#${external}`;
    if (order.id) return `#${order.id.slice(0, 8)}`;
    return '#—';
  };

  const formatCsvOrderId = (order) => {
    if (order.shopifyOrderNumber) return order.shopifyOrderNumber;
    if (order.id) return `#${order.id.slice(0, 8)}`;
    return '';
  };

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const consentBadgeClass = (order) => {
    const status = buildConsentStatus(order);
    if (status === 'Fully Consented') return 'bg-green-50 text-green-700 border border-green-100';
    if (status === 'Standard Only') return 'bg-blue-50 text-blue-700 border border-blue-100';
    return 'bg-gray-50 text-gray-500 border border-gray-100';
  };

  const handleExportCSV = () => {
    if (!sortedOrders.length) return;

    const headers = [
      'Order ID',
      'Date',
      'Influencer',
      'Email',
      'Phone',
      'Instagram',
      'TikTok',
      'Campaign',
      'Status',
      'Fulfillment ID',
      'Value',
      'Consent'
    ];

    const rows = sortedOrders.map((order) => {
      const orderId = formatCsvOrderId(order);
      const orderDate = ` ${formatCsvDate(order.createdAt)}`;
      const orderValue = typeof order.value === 'number'
        ? order.value.toFixed(2)
        : (order.value || '0');

      const csvRow = [
        orderId,
        orderDate,
        order.influencerName || '',
        order.influencerEmail || '',
        order.influencerPhone || '',
        order.influencerInstagram || '',
        order.influencerTiktok || '',
        order.campaignName || '',
        order.status || '',
        order.shopifyFulfillmentId || '',
        orderValue,
        buildConsentStatus(order)
      ];

      return csvRow.map(escapeCsvValue).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `influencer_orders_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderStatusBadge = (status) => {
    const normalized = status || 'pending';
    const isFulfilled = normalized === 'fulfilled';
    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isFulfilled ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
      }`}>
        {normalized}
      </span>
    );
  };

  const renderContactBlock = (order) => {
    const hasPhone = Boolean(order.influencerPhone);
    const hasInstagram = Boolean(order.influencerInstagram);
    const hasTiktok = Boolean(order.influencerTiktok);

    if (!hasPhone && !hasInstagram && !hasTiktok) {
      return <span className="text-sm text-gray-400">—</span>;
    }

    return (
      <div className="space-y-1">
        {hasPhone && <div className="text-sm text-gray-900">{order.influencerPhone}</div>}
        {hasInstagram && <div className="text-xs text-gray-500">IG: {order.influencerInstagram}</div>}
        {hasTiktok && <div className="text-xs text-gray-500">TT: {order.influencerTiktok}</div>}
      </div>
    );
  };

  const tableState = () => {
    if (loading) {
      return (
        <tr>
          <td className="px-6 py-10 text-center text-gray-500 text-sm" colSpan={7}>
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span>Loading orders from Supabase…</span>
            </div>
          </td>
        </tr>
      );
    }

    if (sortedOrders.length === 0) {
      const emptyMessage = orders.length === 0
        ? 'No orders yet. Share a claim link to see activity here.'
        : 'No orders match the current filters.';
      return (
        <tr>
          <td className="px-6 py-10 text-center text-gray-500 text-sm" colSpan={7}>
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return sortedOrders.map((order) => {
      const displayOrderId = formatDisplayOrderId(order);
      const displayDate = formatDate(order.createdAt);
      return (
        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-4">
            <div className="font-mono text-xs text-indigo-600">{displayOrderId}</div>
            <div className="text-xs text-gray-500">{displayDate}</div>
          </td>
          <td className="px-6 py-4">
            <div className="font-medium text-gray-900 text-sm">{order.influencerName || 'Unnamed Influencer'}</div>
            <div className="text-xs text-gray-500">{order.influencerEmail || '—'}</div>
          </td>
          <td className="px-6 py-4">
            {renderContactBlock(order)}
          </td>
          <td className="px-6 py-4">
            <div className="font-medium text-gray-900 text-sm">
              {order.campaignName || '—'}
            </div>
            <div className="text-xs text-gray-500">{(order.items?.length || 0)} items</div>
          </td>
          <td className="px-6 py-4">{renderStatusBadge(order.status)}</td>
          <td className="px-6 py-4">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${consentBadgeClass(order)}`}>
              {buildConsentStatus(order)}
            </span>
          </td>
          <td className="px-6 py-4 text-right font-medium text-gray-900 text-sm">{formatCurrency(order.value)}</td>
        </tr>
      );
    });
  };

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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        </header>

        <main className="p-8 max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><DollarSign size={14}/> Total Gifted Value</p>
              <div className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</div>
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
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <p className="text-xs text-gray-500">Synced from Supabase Testing DB</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchOrders}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Refresh
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={!sortedOrders.length}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Download size={16} />
                    Download CSV
                  </button>
                </div>
                <div className="text-xs text-gray-400">Auto refresh disabled</div>
              </div>
            </div>
            {error && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="px-6 py-3 border-b border-gray-200 bg-white">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Campaign</span>
                  <select
                    value={filters.campaign}
                    onChange={(e) => handleFilterChange('campaign', e.target.value)}
                    className="min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Campaigns</option>
                    {campaignOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Status</span>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="min-w-[140px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Consent</span>
                  <select
                    value={filters.consent}
                    onChange={(e) => handleFilterChange('consent', e.target.value)}
                    className="min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Consent</option>
                    {consentOptions.map((consent) => (
                      <option key={consent} value={consent}>{consent}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                    >
                      Order
                      <ArrowUpDown
                        size={14}
                        className={`h-4 w-4 transform transition-transform ${sortConfig.key === 'date' ? 'text-gray-900' : 'text-gray-400'} ${sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </th>
                  <th className="px-6 py-3">Influencer</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                    >
                      Status
                      <ArrowUpDown
                        size={14}
                        className={`h-4 w-4 transform transition-transform ${sortConfig.key === 'status' ? 'text-gray-900' : 'text-gray-400'} ${sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </th>
                  <th className="px-6 py-3">Consent</th>
                  <th className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('value')}
                      className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900 w-full"
                    >
                      Value
                      <ArrowUpDown
                        size={14}
                        className={`h-4 w-4 transform transition-transform ${sortConfig.key === 'value' ? 'text-gray-900' : 'text-gray-400'} ${sortConfig.key === 'value' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableState()}
              </tbody>
            </table>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-2">
              <AlertTriangle size={12} />
              <span>Shopify sync is not live yet, so statuses stay pending until fulfillment is wired up.</span>
            </div>
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
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4">
                        <a href={`#claim/${c.slug}`} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:text-indigo-600">gift.app/{c.slug}</a>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.status === 'inactive'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {c.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-600">{c.claims_count || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onDeleteCampaign(c.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          Delete
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

/* --- CAMPAIGN BUILDER (Restored Full Functionality) --- */
const CampaignBuilder = ({ onPublish, onCancel }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState({
    name: 'Summer Influencer Seeding',
    slug: 'summer-seeding',
    welcomeMessage: 'Hey! We love your content. Here is a gift on us.',
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
                  <RuleToggle label="Show Phone Field" description="Ask for phone number during checkout." enabled={data.showPhoneField} onChange={v => updateField('showPhoneField', v)} />
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

  const handleDeleteCampaign = async (id) => {
    const shouldDelete = window.confirm('Delete this campaign? This only marks it as deleted in the database.');
    if (!shouldDelete) return;

    try {
      await campaignService.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('Failed to delete campaign', e);
      alert('Unable to delete campaign right now. Please try again.');
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
  
  return (
    <DashboardHome
      campaigns={campaigns}
      onCreateCampaign={() => (window.location.hash = '#create')}
      onDeleteCampaign={handleDeleteCampaign}
      onViewOrders={() => setView('orders')}
    />
  );
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
