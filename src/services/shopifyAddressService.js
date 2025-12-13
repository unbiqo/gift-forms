// Placeholder for Shopify's address autocomplete integration.
// Replace with real API calls once credentials are available.
const MOCK_ADDRESSES = [
  {
    id: 'addr_1',
    label: '200 University Ave W, Waterloo, ON, Canada',
    lines: ['200 University Ave W', 'Waterloo, ON N2L 3G1', 'Canada'],
  },
  {
    id: 'addr_2',
    label: '33 New Montgomery St, San Francisco, CA 94105, USA',
    lines: ['33 New Montgomery St', 'San Francisco, CA 94105', 'United States'],
  },
  {
    id: 'addr_3',
    label: '1 Martin Place, Sydney NSW 2000, Australia',
    lines: ['1 Martin Place', 'Sydney NSW 2000', 'Australia'],
  },
  {
    id: 'addr_4',
    label: '101 Collins St, Melbourne VIC 3000, Australia',
    lines: ['101 Collins St', 'Melbourne VIC 3000', 'Australia'],
  },
];

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const shopifyAddressService = {
  async searchAddresses(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    await delay();
    return MOCK_ADDRESSES.filter(addr => addr.label.toLowerCase().includes(normalized));
  },
};
