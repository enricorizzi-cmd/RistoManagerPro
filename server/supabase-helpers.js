// Supabase Helper Functions
// Translates SQLite operations to Supabase REST API calls

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yuvvqdtyxmdhdamhtszs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dnZxZHR5eG1kaGRhbWh0c3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgwMjIsImV4cCI6MjA3Nzk1NDAyMn0.BW0F7tlFJfccZ7DCCtcGR_0jU79vDBaIuYtyQeTzo5E';

// Helper to make Supabase REST API calls
async function supabaseFetch(method, table, options = {}) {
  const { data, filters = {}, select = '*', order, limit, single = false, upsert = false } = options;
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  
  // Build query string
  if (select !== '*') params.append('select', select);
  if (order) params.append('order', order);
  if (limit) params.append('limit', limit.toString());
  
  // Add filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, `eq.${value}`);
    }
  });
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };
  
  if (single) {
    headers['Accept'] = 'application/vnd.pgjson.object+json';
  }
  
  if (upsert) {
    headers['Prefer'] = 'resolution=merge-duplicates';
  } else if (method === 'POST') {
    headers['Prefer'] = 'return=representation';
  } else if (method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
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
      throw new Error(`Supabase API error (${method} ${table}): ${response.status} - ${errorText}`);
    }
    
    if (method === 'DELETE') {
      return { success: true };
    }
    
    const result = await response.json();
    return Array.isArray(result) ? (single ? result[0] : result) : result;
  } catch (error) {
    console.error(`Supabase request error (${method} ${table}):`, error.message);
    throw error;
  }
}

// Master database functions (for shared tables: locations, users, sessions, permissions)
const masterDbHelpers = {
  // Query - for complex SELECT queries, we'll need to parse SQL or use specific methods
  async query(sql, params = []) {
    // Parse simple SELECT queries
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const select = selectMatch[1].trim();
      const table = selectMatch[2].trim();
      
      // Parse WHERE clause
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
      const filters = {};
      if (whereMatch && params.length > 0) {
        const whereClause = whereMatch[1];
        // Simple WHERE column = ? parsing
        const columnMatch = whereClause.match(/(\w+)\s*=\s*\?/);
        if (columnMatch && params.length > 0) {
          filters[columnMatch[1]] = params[0];
        }
      }
      
      // Parse ORDER BY
      const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
      const order = orderMatch ? orderMatch[1].trim() : undefined;
      
      return await supabaseFetch('GET', table, { select, filters, order });
    }
    
    // For COUNT queries
    const countMatch = sql.match(/SELECT\s+COUNT\(.+?\)\s+as\s+(\w+)\s+FROM\s+(\w+)/i);
    if (countMatch) {
      const table = countMatch[2].trim();
      const result = await supabaseFetch('GET', table, { select: 'id', limit: 1000 });
      return [{ count: Array.isArray(result) ? result.length : (result ? 1 : 0) }];
    }
    
    throw new Error(`Complex SQL query not supported: ${sql}. Use specific Supabase methods.`);
  },
  
  // Get single row
  async get(sql, params = []) {
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const select = selectMatch[1].trim();
      const table = selectMatch[2].trim();
      
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
      const filters = {};
      if (whereMatch && params.length > 0) {
        const whereClause = whereMatch[1];
        // Parse multiple WHERE conditions
        const conditions = whereClause.split(/\s+AND\s+/i);
        conditions.forEach((condition, index) => {
          const columnMatch = condition.match(/(\w+)\s*=\s*\?/);
          if (columnMatch && params[index] !== undefined) {
            filters[columnMatch[1]] = params[index];
          }
        });
      }
      
      return await supabaseFetch('GET', table, { select, filters, single: true });
    }
    
    throw new Error(`Complex SQL query not supported: ${sql}`);
  },
  
  // Run INSERT/UPDATE/DELETE
  async run(sql, params = []) {
    // INSERT
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s+VALUES\s*\((.+?)\)/i);
    if (insertMatch) {
      const table = insertMatch[1].trim();
      const columns = insertMatch[2].split(',').map(c => c.trim());
      const values = insertMatch[3].split(',').map(v => v.trim());
      
      const data = {};
      columns.forEach((col, index) => {
        const value = params[index];
        // Handle ? placeholders
        if (values[index] === '?') {
          data[col] = value;
        }
      });
      
      return await supabaseFetch('POST', table, { data, upsert: false });
    }
    
    // UPDATE
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
    if (updateMatch) {
      const table = updateMatch[1].trim();
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];
      
      const data = {};
      const setPairs = setClause.split(',');
      setPairs.forEach((pair, index) => {
        const [col, val] = pair.split('=').map(s => s.trim());
        if (val === '?') {
          data[col] = params[index];
        } else if (val !== '?') {
          data[col] = val.replace(/'/g, '');
        }
      });
      
      const filters = {};
      const wherePairs = whereClause.split(/\s+AND\s+/i);
      wherePairs.forEach((pair, offset) => {
        const columnMatch = pair.match(/(\w+)\s*=\s*\?/);
        if (columnMatch) {
          const paramIndex = setPairs.length + offset;
          if (params[paramIndex] !== undefined) {
            filters[columnMatch[1]] = params[paramIndex];
          }
        }
      });
      
      return await supabaseFetch('PATCH', table, { data, filters });
    }
    
    // DELETE
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
    if (deleteMatch) {
      const table = deleteMatch[1].trim();
      const whereClause = deleteMatch[2];
      
      const filters = {};
      const columnMatch = whereClause.match(/(\w+)\s*=\s*\?/);
      if (columnMatch && params.length > 0) {
        filters[columnMatch[1]] = params[0];
      }
      
      return await supabaseFetch('DELETE', table, { filters });
    }
    
    throw new Error(`Unsupported SQL operation: ${sql}`);
  },
};

// Location-specific database functions
function getLocationDbHelpers(locationId) {
  return {
    async query(sql, params = []) {
      // Similar to masterDb but adds location_id filter
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (selectMatch) {
        const select = selectMatch[1].trim();
        const table = selectMatch[2].trim();
        
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
        const filters = { location_id: locationId };
        
        if (whereMatch && params.length > 0) {
          const whereClause = whereMatch[1];
          const columnMatch = whereClause.match(/(\w+)\s*=\s*\?/);
          if (columnMatch && params[0] !== undefined) {
            filters[columnMatch[1]] = params[0];
          }
        }
        
        const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
        const order = orderMatch ? orderMatch[1].trim() : undefined;
        
        return await supabaseFetch('GET', table, { select, filters, order });
      }
      
      throw new Error(`Complex SQL query not supported: ${sql}`);
    },
    
    async get(sql, params = []) {
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (selectMatch) {
        const select = selectMatch[1].trim();
        const table = selectMatch[2].trim();
        
        const filters = { location_id: locationId };
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
        if (whereMatch && params.length > 0) {
          const whereClause = whereMatch[1];
          const columnMatch = whereClause.match(/(\w+)\s*=\s*\?/);
          if (columnMatch && params[0] !== undefined) {
            filters[columnMatch[1]] = params[0];
          }
        }
        
        return await supabaseFetch('GET', table, { select, filters, single: true });
      }
      
      throw new Error(`Complex SQL query not supported: ${sql}`);
    },
    
    async run(sql, params = []) {
      // INSERT
      const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s+VALUES\s*\((.+?)\)/i);
      if (insertMatch) {
        const table = insertMatch[1].trim();
        const columns = insertMatch[2].split(',').map(c => c.trim());
        const values = insertMatch[3].split(',').map(v => v.trim());
        
        const data = { location_id: locationId };
        columns.forEach((col, index) => {
          if (col !== 'location_id' && values[index] === '?') {
            data[col] = params[index];
          }
        });
        
        return await supabaseFetch('POST', table, { data, upsert: false });
      }
      
      // UPDATE
      const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
      if (updateMatch) {
        const table = updateMatch[1].trim();
        const setClause = updateMatch[2];
        const whereClause = updateMatch[3];
        
        const data = {};
        const setPairs = setClause.split(',');
        setPairs.forEach((pair, index) => {
          const [col, val] = pair.split('=').map(s => s.trim());
          if (val === '?') {
            data[col] = params[index];
          }
        });
        
        const filters = { location_id: locationId };
        const columnMatch = whereClause.match(/(\w+)\s*=\s*\?/);
        if (columnMatch) {
          const paramIndex = setPairs.length;
          if (params[paramIndex] !== undefined) {
            filters[columnMatch[1]] = params[paramIndex];
          }
        }
        
        return await supabaseFetch('PATCH', table, { data, filters });
      }
      
      // DELETE
      const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
      if (deleteMatch) {
        const table = deleteMatch[1].trim();
        const filters = { location_id: locationId };
        
        const columnMatch = deleteMatch[2].match(/(\w+)\s*=\s*\?/);
        if (columnMatch && params.length > 0) {
          filters[columnMatch[1]] = params[0];
        }
        
        return await supabaseFetch('DELETE', table, { filters });
      }
      
      throw new Error(`Unsupported SQL operation: ${sql}`);
    },
  };
}

module.exports = {
  masterDbHelpers,
  getLocationDbHelpers,
  supabaseFetch,
};

