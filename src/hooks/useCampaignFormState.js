import { useCallback, useEffect, useState } from 'react';
import { campaignService } from '../services/campaignService';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function useCampaignFormState() {
  const [campaignData, setCampaignData] = useState(null);
  const [products, setProducts] = useState([]);
  const [shippingZones, setShippingZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingState, setSavingState] = useState({ action: null, error: null });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { campaign, products: productList, shippingZones: zones } =
          await campaignService.loadInitialData();
        if (!mounted) return;
        setCampaignData(campaign);
        setProducts(productList);
        setShippingZones(zones);
      } catch (err) {
        console.error('Failed to load campaign data', err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = useCallback((field, value) => {
    setCampaignData(prev => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const toggleProduct = useCallback(id => {
    setCampaignData(prev => {
      if (!prev) return prev;
      const selection = prev.selectedProductIds.includes(id)
        ? prev.selectedProductIds.filter(pid => pid !== id)
        : [...prev.selectedProductIds, id];
      return { ...prev, selectedProductIds: selection };
    });
  }, []);

  const setItemLimit = useCallback(value => {
    setCampaignData(prev => {
      if (!prev) return prev;
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        return prev;
      }
      return { ...prev, itemLimit: clamp(numeric, 1, 10) };
    });
  }, []);

  const runAction = useCallback(
    async currentAction => {
      if (!campaignData) return;
      setSavingState({ action: currentAction, error: null });
      try {
        if (currentAction === 'save') {
          await campaignService.saveDraft(campaignData);
        } else if (currentAction === 'publish') {
          await campaignService.publish(campaignData);
        }
        setSavingState({ action: null, error: null });
        return { success: true };
      } catch (err) {
        console.error('Campaign action failed', err);
        setSavingState({ action: null, error: err });
        return { success: false, error: err };
      }
    },
    [campaignData]
  );

  const saveDraft = useCallback(() => runAction('save'), [runAction]);
  const publishCampaign = useCallback(() => runAction('publish'), [runAction]);

  return {
    campaignData,
    products,
    shippingZones,
    loading,
    error,
    savingState,
    updateField,
    toggleProduct,
    setItemLimit,
    saveDraft,
    publishCampaign,
  };
}
