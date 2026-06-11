import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://canada-services-api.onrender.com';

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

function handleError(error) {
  if (error.response?.status === 429) {
    throw new Error('Rate limit reached — please wait a minute and try again');
  }
  if (!error.response) {
    throw new Error(
      'Cannot reach the API — it may be waking up, try again in 30 seconds'
    );
  }
  throw new Error(error.response?.data?.error || error.message || 'Unexpected error');
}

export async function geocodeAddress(address) {
  try {
    const { data } = await api.get('/api/utils/geocode', { params: { address } });
    // Response: { latitude, longitude, display_name, address }
    return data;
  } catch (error) {
    handleError(error);
  }
}

export async function fetchNearby(serviceType, lat, lon, radiusKm) {
  try {
    const { data } = await api.get(`/api/${serviceType}/nearby`, {
      params: { lat, lon, radius: radiusKm, limit: 100 },
    });
    // Response: { total, all: [...], categories: {...}, query: {...} }
    return data;
  } catch (error) {
    handleError(error);
  }
}
