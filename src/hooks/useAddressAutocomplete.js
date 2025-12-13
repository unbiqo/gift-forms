import { useEffect, useRef, useState } from 'react';
import { shopifyAddressService } from '../services/shopifyAddressService';

export function useAddressAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef();

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await shopifyAddressService.searchAddresses(query);
        setSuggestions(results);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = suggestion => {
    setSelected(suggestion);
    setQuery(suggestion.label);
    setSuggestions([]);
  };

  return {
    query,
    setQuery,
    suggestions,
    loading,
    selected,
    setSelected,
    handleSelect,
    clearSuggestions: () => setSuggestions([]),
  };
}
