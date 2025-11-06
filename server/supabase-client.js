// Supabase REST API Client
// Replaces SQLite with Supabase for all database operations

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yuvvqdtyxmdhdamhtszs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dnZxZHR5eG1kaGRhbWh0c3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgwMjIsImV4cCI6MjA3Nzk1NDAyMn0.BW0F7tlFJfccZ7DCCtcGR_0jU79vDBaIuYtyQeTzo5E';

// Helper function to make Supabase REST API calls
async function supabaseRequest(method, table, options = {}) {
  const { data, filters, select, order, limit, single } = options;
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  
  // Add query parameters
  const params = new URLSearchParams();
  if (select) params.append('select', select);
  if (order) params.append('order', order);
  if (limit) params.append('limit', limit);
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': single ? 'return=representation' : 'return=representation',
  };
  
  // For upsert operations
  if (method === 'POST' && options.upsert) {
    headers['Prefer'] = 'resolution=merge-duplicates';
  }
  
  const config = {
    method,
    headers,
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(Array.isArray(data) ? data : [data]);
  }
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API error: ${response.status} - ${errorText}`);
    }
    
    if (method === 'DELETE') {
      return { success: true };
    }
    
    const result = await response.json();
    return Array.isArray(result) ? (single ? result[0] : result) : result;
  } catch (error) {
    console.error(`Supabase request error (${method} ${table}):`, error);
    throw error;
  }
}

// Master database functions (locations, users, sessions, permissions)
const masterDb = {
  async query(sql, params = []) {
    // Convert SQL to Supabase filters
    // This is a simplified version - for complex queries we'll need to parse SQL
    throw new Error('Complex SQL queries not supported. Use specific Supabase methods.');
  },
  
  async get(table, filters = {}) {
    return await supabaseRequest('GET', table, { filters, single: true });
  },
  
  async all(table, filters = {}, options = {}) {
    return await supabaseRequest('GET', table, { filters, ...options });
  },
  
  async run(table, data, options = {}) {
    if (options.operation === 'insert') {
      return await supabaseRequest('POST', table, { data, upsert: options.upsert });
    } else if (options.operation === 'update') {
      return await supabaseRequest('PATCH', table, { data, filters: options.filters });
    } else if (options.operation === 'delete') {
      return await supabaseRequest('DELETE', table, { filters: options.filters });
    }
    throw new Error('Invalid operation');
  },
};

// Location-specific database functions
function getLocationDb(locationId) {
  return {
    async query(sql, params = []) {
      throw new Error('Complex SQL queries not supported. Use specific Supabase methods.');
    },
    
    async get(table, filters = {}) {
      // Add location_id filter for location-specific tables
      const locationFilters = { ...filters, location_id: locationId };
      return await supabaseRequest('GET', table, { filters: locationFilters, single: true });
    },
    
    async all(table, filters = {}, options = {}) {
      const locationFilters = { ...filters, location_id: locationId };
      return await supabaseRequest('GET', table, { filters: locationFilters, ...options });
    },
    
    async run(table, data, options = {}) {
      // Ensure location_id is set
      if (data && !Array.isArray(data)) {
        data.location_id = locationId;
      } else if (Array.isArray(data)) {
        data = data.map(item => ({ ...item, location_id: locationId }));
      }
      
      if (options.operation === 'insert') {
        return await supabaseRequest('POST', table, { data, upsert: options.upsert });
      } else if (options.operation === 'update') {
        return await supabaseRequest('PATCH', table, { data, filters: options.filters });
      } else if (options.operation === 'delete') {
        return await supabaseRequest('DELETE', table, { filters: options.filters });
      }
      throw new Error('Invalid operation');
    },
  };
}

module.exports = {
  masterDb,
  getLocationDb,
  supabaseRequest,
};

