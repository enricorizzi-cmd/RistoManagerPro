import { RestaurantLocation } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  options: globalThis.RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(
      `API call failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// Locations
export const getLocations = (): Promise<RestaurantLocation[]> => {
  return apiCall<RestaurantLocation[]>('/locations');
};

export const updateLocationSettings = (
  locationId: string,
  newSettings: RestaurantLocation
): Promise<RestaurantLocation | undefined> => {
  return apiCall<RestaurantLocation>(`/locations/${locationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: newSettings.name,
      capacity: newSettings.capacity,
      openTime: newSettings.openTime,
      closeTime: newSettings.closeTime,
    }),
  });
};
