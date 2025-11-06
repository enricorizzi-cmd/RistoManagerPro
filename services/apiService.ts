import { RestaurantLocation } from '../types';
import { API_URL } from '../config/api';

const API_BASE_URL = API_URL;

// Helper to check if error is a connection error
function isConnectionError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('ERR_CONNECTION_REFUSED');
  }
  return false;
}

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  options: globalThis.RequestInit = {}
): Promise<T> {
  try {
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
  } catch (error) {
    if (isConnectionError(error)) {
      throw new Error(
        'Il server backend non è disponibile. Assicurati che il server sia avviato sulla porta 4000.'
      );
    }
    throw error;
  }
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
