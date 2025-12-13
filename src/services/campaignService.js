const MOCK_PRODUCTS = [
  {
    id: 'p1',
    title: 'Vintage Leather Jacket',
    image:
      'https://images.unsplash.com/photo-1646300451176-f16171b2d03d?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    price: 650,
  },
  {
    id: 'p2',
    title: 'Performance Energy Drink',
    image:
      'https://images.unsplash.com/photo-1633710734156-a33cd91d7ac9?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    price: 45,
  },
  {
    id: 'p3',
    title: 'Hydrating Face Cream',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=300',
    price: 120,
  },
  {
    id: 'p4',
    title: 'Ceramic Diffuser',
    image:
      'https://images.unsplash.com/photo-1572176798680-aa8103f4b61f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    price: 55,
  },
];

const SHIPPING_COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany'];

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const campaignService = {
  async loadInitialData() {
    await delay();
    return {
      campaign: {
        name: 'Summer Influencer Seeding',
        welcomeMessage: 'Hey! We love your content. Here is a gift on us.',
        selectedProductIds: ['p1', 'p2', 'p3'],
        brandColor: '#000000',
        brandLogo: null,
        itemLimit: 1,
        orderLimitPerLink: 5,
        campaignOrderCap: '',
        maxCartValue: '',
        blockDuplicateOrders: true,
        shippingZone: 'United States',
        restrictedCountries: '',
        showPhoneField: true,
        showInstagramField: true,
        showTiktokField: true,
        showConsentCheckbox: true,
        termsConsentText: 'I consent to reposting my content.',
        secondConsentText: '',
        requireSecondConsent: false,
        emailOptIn: false,
        showSoldOut: true,
        hideInactiveProducts: true,
        allowQuantitySelector: false,
      },
      products: MOCK_PRODUCTS,
      shippingZones: SHIPPING_COUNTRIES,
    };
  },

  async saveDraft(payload) {
    await delay();
    console.info('Saving draft', payload);
  },

  async publish(payload) {
    await delay();
    console.info('Publishing campaign', payload);
  },
};

export function getProductCatalog() {
  return MOCK_PRODUCTS.map(product => ({ ...product }));
}
