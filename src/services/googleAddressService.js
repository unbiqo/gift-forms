const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const LIBRARIES = ["places"];

let googleMapsPromise = null;

// 1. DYNAMIC LOADER: Only loads the heavy Google script when user starts typing
const loadGoogleMaps = () => {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  
  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  }
  return googleMapsPromise;
};

// 2. THE SERVICE OBJECT
export const googleAddressService = {
  // Autocomplete: Gets predictions while typing (e.g., "123 Ma" -> "123 Main St...")
  async searchAddresses(query) {
    if (!query || query.length < 3) return [];
    
    await loadGoogleMaps();
    const autocompleteService = new window.google.maps.places.AutocompleteService();
    
    return new Promise((resolve) => {
      autocompleteService.getPlacePredictions(
        { input: query, types: ['address'] }, // Restrict results to actual addresses
        (predictions, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([]);
            return;
          }
          // Format into a simple list for your UI
          resolve(predictions.map(p => ({
            id: p.place_id,      // IMPORTANT: We need this ID to get the Zip Code later
            label: p.description
          })));
        }
      );
    });
  },

  // Details: Converts the ID selected above into actual shipping data (Zip, City, Country)
  async getPlaceDetails(placeId) {
    await loadGoogleMaps();
    // We need a dummy div to initialize the PlacesService (quirk of Google API)
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));

    return new Promise((resolve, reject) => {
      placesService.getDetails(
        { placeId, fields: ['address_components', 'formatted_address'] },
        (place, status) => {
          if (status === 'OK' && place) {
            resolve(parseGoogleAddress(place));
          } else {
            reject('Failed to fetch address details');
          }
        }
      );
    });
  }
};

// 3. PARSER HELPER: Converts Google's complex array into a clean object for Shopify
const parseGoogleAddress = (place) => {
  const components = place.address_components;
  const getComponent = (type) => components.find(c => c.types.includes(type))?.long_name || '';

  return {
    fullAddress: place.formatted_address,
    address1: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
    city: getComponent('locality') || getComponent('sublocality'),
    province: getComponent('administrative_area_level_1'), // State/Province
    zip: getComponent('postal_code'),
    country: getComponent('country'),
  };
};