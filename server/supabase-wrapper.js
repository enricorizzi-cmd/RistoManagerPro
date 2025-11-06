// Supabase Wrapper Functions
// Drop-in replacement for SQLite functions in server/index.js

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://yuvvqdtyxmdhdamhtszs.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dnZxZHR5eG1kaGRhbWh0c3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgwMjIsImV4cCI6MjA3Nzk1NDAyMn0.BW0F7tlFJfccZ7DCCtcGR_0jU79vDBaIuYtyQeTzo5E';

// Log Supabase configuration on startup (without exposing full key)
console.log('[SUPABASE] Configuration:', {
  url: SUPABASE_URL,
  keyConfigured: !!process.env.SUPABASE_KEY,
  keyLength: SUPABASE_KEY ? SUPABASE_KEY.length : 0,
});

// Direct Supabase REST API call
async function supabaseCall(method, table, options = {}) {
  const {
    data,
    filters = {},
    select = '*',
    order,
    limit,
    single = false,
    upsert = false,
  } = options;

  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const urlParams = new URLSearchParams();

  if (select !== '*') {
    // For select, we need to pass columns separated by comma
    urlParams.append('select', select);
  }
  if (order) {
    urlParams.append('order', order);
  }
  if (limit) {
    urlParams.append('limit', limit.toString());
  }

  // Add filters (format: column=eq.value or column=neq.value)
  // Supabase PostgREST uses operators like eq., neq., etc.
  // URLSearchParams will handle URL encoding automatically
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // If value already contains operator (like neq.value), use it directly
      if (typeof value === 'string' && value.includes('.') && !value.startsWith('eq.') && !value.startsWith('neq.')) {
        // Already has an operator, use as-is
        urlParams.append(key, value);
      } else {
        // Use 'eq.' operator for all values
        let filterValue;
        if (typeof value === 'boolean') {
          filterValue = value.toString();
        } else if (typeof value === 'string') {
          // For strings, use the value as-is
          // URLSearchParams will encode it properly
          filterValue = value;
        } else {
          filterValue = value.toString();
        }
        // Build the filter string: column=eq.value
        // URLSearchParams will encode both key and value properly
        urlParams.append(key, `eq.${filterValue}`);
      }
    }
  });

  const queryString = urlParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  console.log(`[SUPABASE] Final URL (truncated): ${url.substring(0, 300)}`);

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  // Don't use Accept header for single - we'll handle it in the response
  // if (single) {
  //   headers['Accept'] = 'application/vnd.pgjson.object+json';
  // }

  if (upsert) {
    headers['Prefer'] = 'resolution=merge-duplicates';
  } else if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }

  // For single results, limit to 1
  if (single && !limit) {
    params.append('limit', '1');
  }

  const config = { method, headers };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(Array.isArray(data) ? data : [data]);
  }

  try {
    console.log(`[SUPABASE] ${method} ${url}`);
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SUPABASE] Error ${response.status}:`, errorText);
      throw new Error(
        `Supabase API error (${method} ${table}): ${response.status} - ${errorText}`
      );
    }

    if (method === 'DELETE') {
      return { success: true };
    }

    const result = await response.json();
    if (single) {
      // For single results, return first item or null if array is empty
      return Array.isArray(result)
        ? result.length > 0
          ? result[0]
          : null
        : result;
    }
    return Array.isArray(result) ? result : result;
  } catch (error) {
    console.error(`Supabase error (${method} ${table}):`, error.message);
    throw error;
  }
}

// Parse simple SQL WHERE clauses to filters
function parseWhereClause(whereClause, params) {
  const filters = {};
  if (!whereClause) return filters;

  // Handle simple WHERE column = ? patterns
  const conditions = whereClause.split(/\s+AND\s+/i);
  let paramIndex = 0;

  conditions.forEach(condition => {
    condition = condition.trim();

    // Handle = ? (parameterized)
    const eqMatch = condition.match(/(\w+)\s*=\s*\?/);
    if (eqMatch && params[paramIndex] !== undefined) {
      filters[eqMatch[1]] = params[paramIndex];
      paramIndex++;
      return;
    }

    // Handle != ? or <> ? (parameterized)
    const neMatch = condition.match(/(\w+)\s*(?:!=|<>)\s*\?/);
    if (neMatch && params[paramIndex] !== undefined) {
      // Supabase uses neq. for not equal
      filters[neMatch[1]] = `neq.${params[paramIndex]}`;
      paramIndex++;
      return;
    }

    // Handle numeric literals like is_active = 1
    // For boolean columns in Supabase, convert 1 to true and 0 to false
    const numericMatch = condition.match(/(\w+)\s*=\s*(\d+)/);
    if (numericMatch) {
      const columnName = numericMatch[1];
      const value = parseInt(numericMatch[2], 10);
      // Check if this looks like a boolean column (is_active, is_enabled, etc.)
      if (columnName.startsWith('is_')) {
        filters[columnName] = value === 1;
      } else {
        filters[columnName] = value;
      }
      return;
    }

    // Handle string literals like status = "active" or status = 'active'
    const literalMatch = condition.match(/(\w+)\s*=\s*["']([^"']+)["']/);
    if (literalMatch) {
      filters[literalMatch[1]] = literalMatch[2];
      return;
    }
  });

  return filters;
}

// Master database functions (shared tables)
const masterDb = {
  async query(sql, params = []) {
    // Parse SELECT queries
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (selectMatch) {
        // Remove spaces after commas in select clause for Supabase
        const select = selectMatch[1].trim().replace(/\s*,\s*/g, ',');
        const table = selectMatch[2].trim();

        const whereMatch = sql.match(
          /WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i
        );
        const filters = parseWhereClause(whereMatch ? whereMatch[1] : '', params);

        const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
        const order = orderMatch
          ? orderMatch[1]
              .trim()
              .replace(/\s+DESC/i, '.desc')
              .replace(/\s+ASC/i, '.asc')
              .replace(/\s*,\s*/g, ',') // Remove spaces after commas in order by
          : undefined;

        // Handle COUNT queries
        if (select.includes('COUNT')) {
          const result = await supabaseCall('GET', table, {
            filters,
            limit: 1000,
          });
          const count = Array.isArray(result) ? result.length : result ? 1 : 0;
          return [{ count }];
        }

        // Handle GROUP_CONCAT (convert to array aggregation)
        if (select.includes('GROUP_CONCAT')) {
          // For now, return all and group in JS
          const result = await supabaseCall('GET', table, { filters, order });
          return result;
        }

        return await supabaseCall('GET', table, { select, filters, order });
      }

    throw new Error(`Unsupported SQL query: ${sql}`);
  },

  async get(sql, params = []) {
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      // Remove spaces after commas in select clause for Supabase
      const select = selectMatch[1].trim().replace(/\s*,\s*/g, ',');
      const table = selectMatch[2].trim();

      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
      const filters = parseWhereClause(whereMatch ? whereMatch[1] : '', params);

      console.log(`[SUPABASE] GET query: table=${table}, select=${select}, filters=`, filters);

      return await supabaseCall('GET', table, {
        select,
        filters,
        single: true,
      });
    }

    throw new Error(`Unsupported SQL query: ${sql}`);
  },

  async run(sql, params = []) {
    // INSERT
    const insertMatch = sql.match(
      /INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s+VALUES\s*\((.+?)\)/i
    );
    if (insertMatch) {
      const table = insertMatch[1].trim();
      const columns = insertMatch[2].split(',').map(c => c.trim());
      const placeholders = insertMatch[3].split(',').map(p => p.trim());

      const data = {};
      columns.forEach((col, index) => {
        if (placeholders[index] === '?' && params[index] !== undefined) {
          data[col] = params[index];
        }
      });

      return await supabaseCall('POST', table, { data, upsert: false });
    }

    // UPDATE
    const updateMatch = sql.match(
      /UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i
    );
    if (updateMatch) {
      const table = updateMatch[1].trim();
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];

      const data = {};
      const setPairs = setClause.split(',').map(p => p.trim());
      let paramIndex = 0;

      setPairs.forEach(pair => {
        const [col, val] = pair.split('=').map(s => s.trim());
        if (val === '?') {
          data[col] = params[paramIndex++];
        } else if (!val.includes('?')) {
          // Handle non-parameter values
          data[col] = val.replace(/'/g, '').trim();
        }
      });

      const filters = parseWhereClause(whereClause, params.slice(paramIndex));

      return await supabaseCall('PATCH', table, { data, filters });
    }

    // DELETE
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
    if (deleteMatch) {
      const table = deleteMatch[1].trim();
      const whereClause = deleteMatch[2];
      const filters = parseWhereClause(whereClause, params);

      return await supabaseCall('DELETE', table, { filters });
    }

    throw new Error(`Unsupported SQL operation: ${sql}`);
  },
};

// Location-specific database functions
function getLocationDb(locationId) {
  return {
    async query(sql, params = []) {
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (selectMatch) {
        // Remove spaces after commas in select clause for Supabase
        const select = selectMatch[1].trim().replace(/\s*,\s*/g, ',');
        const table = selectMatch[2].trim();

        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
        const filters = { location_id: locationId };
        Object.assign(
          filters,
          parseWhereClause(whereMatch ? whereMatch[1] : '', params)
        );

        const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
        const order = orderMatch
          ? orderMatch[1]
              .trim()
              .replace(/\s+DESC/i, '.desc')
              .replace(/\s+ASC/i, '.asc')
              .replace(/\s*,\s*/g, ',') // Remove spaces after commas
          : 'created_at.desc';

        return await supabaseCall('GET', table, { select, filters, order });
      }

      throw new Error(`Unsupported SQL query: ${sql}`);
    },

    async get(sql, params = []) {
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (selectMatch) {
        // Remove spaces after commas in select clause for Supabase
        const select = selectMatch[1].trim().replace(/\s*,\s*/g, ',');
        const table = selectMatch[2].trim();

        const filters = { location_id: locationId };
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
        Object.assign(
          filters,
          parseWhereClause(whereMatch ? whereMatch[1] : '', params)
        );

        return await supabaseCall('GET', table, {
          select,
          filters,
          single: true,
        });
      }

      throw new Error(`Unsupported SQL query: ${sql}`);
    },

    async run(sql, params = []) {
      // INSERT
      const insertMatch = sql.match(
        /INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s+VALUES\s*\((.+?)\)/i
      );
      if (insertMatch) {
        const table = insertMatch[1].trim();
        const columns = insertMatch[2].split(',').map(c => c.trim());
        const placeholders = insertMatch[3].split(',').map(p => p.trim());

        const data = { location_id: locationId };
        columns.forEach((col, index) => {
          if (
            col !== 'location_id' &&
            placeholders[index] === '?' &&
            params[index] !== undefined
          ) {
            data[col] = params[index];
          }
        });

        return await supabaseCall('POST', table, { data, upsert: false });
      }

      // UPDATE
      const updateMatch = sql.match(
        /UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i
      );
      if (updateMatch) {
        const table = updateMatch[1].trim();
        const setClause = updateMatch[2];
        const whereClause = updateMatch[3];

        const data = {};
        const setPairs = setClause.split(',').map(p => p.trim());
        let paramIndex = 0;

        setPairs.forEach(pair => {
          const [col, val] = pair.split('=').map(s => s.trim());
          if (val === '?') {
            data[col] = params[paramIndex++];
          }
        });

        const filters = { location_id: locationId };
        Object.assign(
          filters,
          parseWhereClause(whereClause, params.slice(paramIndex))
        );

        return await supabaseCall('PATCH', table, { data, filters });
      }

      // DELETE
      const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
      if (deleteMatch) {
        const table = deleteMatch[1].trim();
        const filters = { location_id: locationId };
        Object.assign(filters, parseWhereClause(deleteMatch[2], params));

        return await supabaseCall('DELETE', table, { filters });
      }

      throw new Error(`Unsupported SQL operation: ${sql}`);
    },
  };
}

module.exports = {
  masterDb,
  getLocationDb,
  supabaseCall,
};
