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
  const queryParams = [];

  if (select !== '*') {
    // For select, we need to pass columns separated by comma
    queryParams.push(`select=${encodeURIComponent(select)}`);
  }
  if (order) {
    queryParams.push(`order=${encodeURIComponent(order)}`);
  }
  if (limit) {
    queryParams.push(`limit=${limit.toString()}`);
  } else if (!single) {
    // If no limit specified and not a single result, use a high limit to get all results
    // Supabase default is 1000, but we want to get all results
    queryParams.push('limit=10000');
  }

  // For single results, limit to 1 if no limit specified
  if (single && !limit) {
    queryParams.push('limit=1');
  }

  // Add filters (format: column=eq.value or column=neq.value)
  // Supabase PostgREST REQUIRES operators like eq., neq., etc. for filters
  // Without the operator, PostgREST treats it as a column selector, not a filter!
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Check if value already has an operator prefix
      const hasOperator =
        typeof value === 'string' &&
        (value.startsWith('eq.') ||
          value.startsWith('neq.') ||
          value.startsWith('gt.') ||
          value.startsWith('gte.') ||
          value.startsWith('lt.') ||
          value.startsWith('lte.') ||
          value.startsWith('like.') ||
          value.startsWith('ilike.') ||
          value.startsWith('in.') ||
          value.startsWith('is.'));

      if (hasOperator) {
        // Value already has operator, use as-is but encode properly
        // Encode both key and value, but keep operator visible
        queryParams.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        );
      } else {
        // ALWAYS use 'eq.' operator for values that don't have one
        // This is critical - without eq., PostgREST won't treat it as a filter!
        let filterValue;
        if (typeof value === 'boolean') {
          // For boolean values, check if column is integer type (like is_active)
          // Supabase integer columns expect 1/0, not true/false
          if (key.startsWith('is_')) {
            // Convert boolean to integer: true -> 1, false -> 0
            filterValue = value ? '1' : '0';
          } else {
            // For actual boolean columns, use string representation
            filterValue = value.toString();
          }
        } else if (typeof value === 'string') {
          // For strings, encode only the value part, not the eq. prefix
          filterValue = encodeURIComponent(value);
        } else {
          filterValue = value.toString();
        }
        // Build the filter string: column=eq.value
        // Format: email=eq.enricorizzi1991%40gmail.com
        // Format: is_active=eq.1 (for integer boolean columns)
        // CRITICAL: Never encode the 'eq.' part, only encode the value
        const param = `${encodeURIComponent(key)}=eq.${filterValue}`;
        queryParams.push(param);
        console.log(
          `[SUPABASE] Filter added: ${key}=eq.${typeof value === 'string' ? value.substring(0, 30) + '...' : value}`
        );
      }
    }
  });

  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  console.log(`[SUPABASE] Query params count: ${queryParams.length}`);
  console.log(`[SUPABASE] Query params:`, queryParams.slice(0, 5)); // Show first 5 params
  console.log(`[SUPABASE] Final URL (truncated): ${url.substring(0, 400)}`);

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

      // Try to parse error as JSON (Supabase returns JSON errors)
      let errorJson = null;
      let errorMessage = errorText;
      let errorCode = null;

      try {
        errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorText;
        errorCode = errorJson.code || null;
      } catch (e) {
        // Not JSON, use errorText as is
      }

      // Check if error is due to table not existing
      const errorTextLower = errorText.toLowerCase();
      const errorMessageLower = errorMessage.toLowerCase();
      const isPGRST205 = errorCode === 'PGRST205';
      const isTableNotFound =
        response.status === 404 ||
        response.status === 500 ||
        isPGRST205 ||
        errorTextLower.includes('relation') ||
        errorTextLower.includes('does not exist') ||
        errorTextLower.includes('could not find') ||
        errorTextLower.includes('no such table') ||
        errorTextLower.includes('undefined table') ||
        errorTextLower.includes('schema cache') ||
        errorMessageLower.includes('relation') ||
        errorMessageLower.includes('does not exist') ||
        errorMessageLower.includes('could not find') ||
        errorMessageLower.includes('no such table') ||
        errorMessageLower.includes('undefined table') ||
        errorMessageLower.includes('schema cache');

      if (isTableNotFound) {
        const tableNotFoundError = new Error(
          `Table ${table} does not exist in Supabase`
        );
        tableNotFoundError.statusCode = response.status;
        tableNotFoundError.table = table;
        tableNotFoundError.code = errorCode;
        throw tableNotFoundError;
      }

      throw new Error(
        `Supabase API error (${method} ${table}): ${response.status} - ${errorMessage}`
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

      console.log(
        `[SUPABASE] GET query: table=${table}, select=${select}, filters=`,
        filters
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
      const columns = insertMatch[2]
        .split(',')
        .map(c => c.trim().replace(/^["']|["']$/g, '')); // Remove quotes from column names
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
        const cleanCol = col.replace(/^["']|["']$/g, ''); // Remove quotes from column names
        if (val === '?') {
          data[cleanCol] = params[paramIndex++];
        } else if (!val.includes('?')) {
          // Handle non-parameter values
          data[cleanCol] = val.replace(/'/g, '').trim();
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
      try {
        // Normalize SQL: remove extra whitespace and newlines
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();

        const selectMatch = normalizedSql.match(
          /SELECT\s+(.+?)\s+FROM\s+(\w+)/i
        );
        if (!selectMatch) {
          throw new Error(
            `Invalid SELECT query: ${normalizedSql.substring(0, 100)}`
          );
        }

        const select = selectMatch[1].trim();
        const table = selectMatch[2].trim();

        console.log(
          `[SUPABASE] Query: table=${table}, select=${select.substring(0, 100)}`
        );

        // Check for GROUP BY queries (aggregation queries)
        // Match GROUP BY that may be followed by ORDER BY or end of string
        // Use a more robust pattern: capture everything after GROUP BY until ORDER BY, LIMIT, or end
        const groupByIndex = normalizedSql.toUpperCase().indexOf('GROUP BY');
        if (groupByIndex !== -1) {
          // Find the start of GROUP BY columns
          const groupByStart = groupByIndex + 9; // length of "GROUP BY"
          // Find the end: ORDER BY, LIMIT, or end of string
          const orderByIndex = normalizedSql
            .toUpperCase()
            .indexOf(' ORDER BY', groupByStart);
          const limitIndex = normalizedSql
            .toUpperCase()
            .indexOf(' LIMIT', groupByStart);

          let groupByEnd = normalizedSql.length;
          if (orderByIndex !== -1 && orderByIndex < groupByEnd) {
            groupByEnd = orderByIndex;
          }
          if (limitIndex !== -1 && limitIndex < groupByEnd) {
            groupByEnd = limitIndex;
          }

          const groupByClause = normalizedSql
            .substring(groupByStart, groupByEnd)
            .trim();
          console.log(
            '[SUPABASE] GROUP BY query detected:',
            normalizedSql.substring(0, 200)
          );
          console.log('[SUPABASE] GROUP BY clause:', groupByClause);

          // For GROUP BY queries, we need to fetch all data and aggregate in JS
          // because Supabase PostgREST doesn't support GROUP BY directly
          const groupByColumns = groupByClause
            .trim()
            .split(',')
            .map(col => col.trim());

          console.log('[SUPABASE] GROUP BY columns:', groupByColumns);

          // Extract aggregation functions (SUM, COUNT, AVG, etc.)
          const hasSum = select.includes('SUM(');
          const hasCount = select.includes('COUNT(');
          const hasAvg = select.includes('AVG(');

          // Get all columns needed (group by columns + aggregated columns)
          const allColumns = [...groupByColumns];
          if (hasSum) {
            const sumMatch = select.match(/SUM\((\w+)\)/i);
            if (sumMatch) {
              allColumns.push(sumMatch[1]);
              console.log('[SUPABASE] SUM column:', sumMatch[1]);
            }
          }

          // Build select clause for fetching raw data
          const rawSelect = allColumns.join(',');
          console.log('[SUPABASE] Raw select for GROUP BY:', rawSelect);

          const whereMatch = normalizedSql.match(
            /WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i
          );
          // Tables that don't have location_id column
          const tablesWithoutLocationId = [
            'recipe_ingredients',
            'recipe_sales',
          ];
          const filters = {};
          // Only add location_id if the table requires it
          if (!tablesWithoutLocationId.includes(table)) {
            filters.location_id = locationId;
          }
          Object.assign(
            filters,
            parseWhereClause(whereMatch ? whereMatch[1] : '', params)
          );

          console.log('[SUPABASE] Filters for GROUP BY:', filters);

          // Fetch all matching rows
          const allRows = await supabaseCall('GET', table, {
            select: rawSelect.replace(/\s*,\s*/g, ','),
            filters,
            limit: 10000, // Large limit for aggregation
          });

          console.log(
            '[SUPABASE] Fetched rows for aggregation:',
            allRows.length
          );

          if (!Array.isArray(allRows)) {
            console.error('[SUPABASE] Expected array but got:', typeof allRows);
            throw new Error('Failed to fetch data for aggregation');
          }

          // Perform aggregation in JavaScript
          const grouped = new Map();

          allRows.forEach(row => {
            // Create key from group by columns
            const key = groupByColumns.map(col => row[col]).join('|');

            if (!grouped.has(key)) {
              grouped.set(key, {});
              groupByColumns.forEach(col => {
                grouped.get(key)[col] = row[col];
              });
              if (hasSum) {
                const sumCol = select.match(/SUM\((\w+)\)\s+as\s+(\w+)/i);
                if (sumCol) {
                  grouped.get(key)[sumCol[2]] = 0;
                } else {
                  const sumColSimple = select.match(/SUM\((\w+)\)/i);
                  if (sumColSimple) {
                    grouped.get(key)[`sum_${sumColSimple[1]}`] = 0;
                  }
                }
              }
            }

            // Aggregate values
            if (hasSum) {
              const sumMatch = select.match(/SUM\((\w+)\)\s+as\s+(\w+)/i);
              if (sumMatch) {
                const colName = sumMatch[1];
                const alias = sumMatch[2];
                grouped.get(key)[alias] =
                  (grouped.get(key)[alias] || 0) +
                  (parseFloat(row[colName]) || 0);
              } else {
                const sumMatchSimple = select.match(/SUM\((\w+)\)/i);
                if (sumMatchSimple) {
                  const colName = sumMatchSimple[1];
                  const alias = `sum_${colName}`;
                  grouped.get(key)[alias] =
                    (grouped.get(key)[alias] || 0) +
                    (parseFloat(row[colName]) || 0);
                }
              }
            }
          });

          let result = Array.from(grouped.values());

          // Apply ORDER BY if present
          const orderMatch = normalizedSql.match(
            /ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i
          );
          if (orderMatch) {
            const orderClause = orderMatch[1].trim();
            const orderParts = orderClause.split(',').map(p => p.trim());
            result.sort((a, b) => {
              for (const part of orderParts) {
                const desc = part.toUpperCase().includes('DESC');
                const col = part.replace(/\s+(ASC|DESC)/i, '').trim();
                const aVal = a[col];
                const bVal = b[col];
                if (aVal !== bVal) {
                  const comparison = aVal < bVal ? -1 : 1;
                  return desc ? -comparison : comparison;
                }
              }
              return 0;
            });
          }

          // Map result to match expected column names
          const finalResult = result.map(row => {
            const mapped = {};
            groupByColumns.forEach(col => {
              mapped[col] = row[col];
            });

            // Map SUM results
            if (hasSum) {
              const sumMatch = select.match(/SUM\((\w+)\)\s+as\s+(\w+)/i);
              if (sumMatch) {
                mapped[sumMatch[2]] = row[sumMatch[2]];
              } else {
                const sumMatchSimple = select.match(/SUM\((\w+)\)/i);
                if (sumMatchSimple) {
                  const colName = sumMatchSimple[1];
                  mapped[`total_value`] = row[`sum_${colName}`];
                }
              }
            }

            return mapped;
          });

          console.log('[SUPABASE] GROUP BY result count:', finalResult.length);
          return finalResult;
        }

        // Check if query has aggregation functions (SUM, COUNT, AVG, etc.) without GROUP BY
        // In this case, we need to fetch all data and aggregate in JavaScript
        const hasAggregation = /SUM\(|COUNT\(|AVG\(|MAX\(|MIN\(/i.test(select);

        if (hasAggregation && groupByIndex === -1) {
          // This is an aggregation query without GROUP BY (e.g., SELECT SUM(...) FROM ...)
          // Extract column names from SUM() functions
          const sumMatches = select.matchAll(/SUM\((\w+)\)\s+as\s+(\w+)/gi);
          const sumColumns = [];
          const sumAliases = {};

          for (const match of sumMatches) {
            sumColumns.push(match[1]);
            sumAliases[match[1]] = match[2];
          }

          // If no matches with "as", try without alias
          if (sumColumns.length === 0) {
            const sumMatchesSimple = select.matchAll(/SUM\((\w+)\)/gi);
            for (const match of sumMatchesSimple) {
              sumColumns.push(match[1]);
              sumAliases[match[1]] = `sum_${match[1]}`;
            }
          }

          // If still no columns found, this might be COUNT(*) or other aggregation
          // Fall back to selecting all columns
          if (sumColumns.length === 0) {
            // For COUNT(*), we don't need specific columns, just count rows
            if (select.includes('COUNT(*)')) {
              sumColumns.push('*');
              sumAliases['*'] = 'count';
            } else {
              // For other aggregations, try to extract column name from function
              const anyAggMatch = select.match(/(?:SUM|AVG|MAX|MIN)\((\w+)\)/i);
              if (anyAggMatch) {
                sumColumns.push(anyAggMatch[1]);
                sumAliases[anyAggMatch[1]] =
                  select.match(/as\s+(\w+)/i)?.[1] || `agg_${anyAggMatch[1]}`;
              } else {
                // Last resort: select all columns
                sumColumns.push('*');
              }
            }
          }

          // Build select clause for fetching raw data (just the columns, not SUM)
          const rawSelect = sumColumns.length > 0 ? sumColumns.join(',') : '*';

          const whereMatch = normalizedSql.match(
            /WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i
          );
          // Tables that don't have location_id column
          const tablesWithoutLocationId = [
            'recipe_ingredients',
            'recipe_sales',
          ];
          const filters = {};

          // Parse WHERE clause first to get all filters including location_id if present
          const whereClause = whereMatch ? whereMatch[1] : '';
          const parsedFilters = parseWhereClause(whereClause, params);

          // Check if location_id is already in parsed filters
          const hasLocationIdInParsedFilters = 'location_id' in parsedFilters;

          // Only add location_id automatically if:
          // 1. Table requires it (not in tablesWithoutLocationId)
          // 2. location_id is not already in WHERE clause (checked via parsedFilters)
          if (
            !tablesWithoutLocationId.includes(table) &&
            !hasLocationIdInParsedFilters
          ) {
            filters.location_id = locationId;
          }

          // Merge parsed filters (this will override location_id if it was set above, which is correct)
          Object.assign(filters, parsedFilters);

          // Fetch all matching rows
          const allRows = await supabaseCall('GET', table, {
            select:
              rawSelect === '*' ? '*' : rawSelect.replace(/\s*,\s*/g, ','),
            filters,
            limit: 10000,
          });

          if (!Array.isArray(allRows)) {
            throw new Error('Failed to fetch data for aggregation');
          }

          // Perform aggregation in JavaScript
          const aggregated = {};

          // Handle COUNT(*) separately
          if (sumColumns.includes('*') && select.includes('COUNT(*)')) {
            aggregated.count = Array.isArray(allRows)
              ? allRows.length
              : allRows
                ? 1
                : 0;
          } else {
            // Initialize aggregated values
            sumColumns.forEach(col => {
              if (col !== '*') {
                aggregated[sumAliases[col]] = 0;
              }
            });

            // Aggregate values
            if (Array.isArray(allRows) && allRows.length > 0) {
              allRows.forEach(row => {
                sumColumns.forEach(col => {
                  if (col !== '*') {
                    const value = parseFloat(row[col] || 0);
                    if (!isNaN(value)) {
                      aggregated[sumAliases[col]] += value;
                    }
                  }
                });
              });
            }
          }

          return [aggregated];
        }

        // Regular SELECT query without GROUP BY and without aggregation
        // Handle SELECT with aliases (e.g., "column as alias")
        // For Supabase, we need to pass columns without aliases
        // Then map the results back to use aliases
        let cleanSelect = select;
        const aliasMap = {}; // Map original column name -> alias

        // Handle SELECT * (select all columns)
        if (select.trim() === '*') {
          cleanSelect = '*';
        } else if (select.includes(' as ')) {
          // Extract column names (before "as") for Supabase query
          // Keep track of aliases for mapping later
          const selectParts = select.split(',');
          cleanSelect = selectParts
            .map(col => {
              const trimmed = col.trim();
              const asMatch = trimmed.match(/^(.+?)\s+as\s+(\w+)$/i);
              if (asMatch) {
                const originalCol = asMatch[1].trim();
                const alias = asMatch[2].trim();
                aliasMap[originalCol] = alias;
                return originalCol;
              }
              return trimmed;
            })
            .join(',');
          // Remove spaces after commas in select clause for Supabase
          cleanSelect = cleanSelect.replace(/\s*,\s*/g, ',');
        } else {
          // Remove spaces after commas in select clause for Supabase
          cleanSelect = cleanSelect.replace(/\s*,\s*/g, ',');
        }

        const whereMatch = normalizedSql.match(
          /WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i
        );
        // Tables that don't have location_id column
        const tablesWithoutLocationId = ['recipe_ingredients', 'recipe_sales'];
        const filters = {};

        // Parse WHERE clause first to get all filters including location_id if present
        const whereClause = whereMatch ? whereMatch[1] : '';
        const parsedFilters = parseWhereClause(whereClause, params);

        // Check if location_id is already in parsed filters
        const hasLocationIdInParsedFilters = 'location_id' in parsedFilters;

        // Only add location_id automatically if:
        // 1. Table requires it (not in tablesWithoutLocationId)
        // 2. location_id is not already in WHERE clause (checked via parsedFilters)
        if (
          !tablesWithoutLocationId.includes(table) &&
          !hasLocationIdInParsedFilters
        ) {
          filters.location_id = locationId;
        }

        // Merge parsed filters (this will override location_id if it was set above, which is correct)
        Object.assign(filters, parsedFilters);

        const orderMatch = normalizedSql.match(
          /ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i
        );
        let order;
        if (orderMatch) {
          // Parse ORDER BY clause: handle multiple columns with optional ASC/DESC
          // Format: "column1, column2 DESC" -> "column1.asc,column2.desc"
          const orderClause = orderMatch[1].trim();
          console.log('[SUPABASE] ORDER BY clause:', orderClause);
          order = orderClause
            .split(',')
            .map(col => {
              const trimmed = col.trim();
              const upper = trimmed.toUpperCase();
              if (upper.includes(' DESC')) {
                return trimmed
                  .replace(/\s+DESC/i, '.desc')
                  .replace(/\s+ASC/i, '');
              } else if (upper.includes(' ASC')) {
                return trimmed
                  .replace(/\s+ASC/i, '.asc')
                  .replace(/\s+DESC/i, '');
              } else {
                // Default to ASC if not specified
                return trimmed + '.asc';
              }
            })
            .join(','); // Join without spaces
          console.log('[SUPABASE] Parsed ORDER BY:', order);
        } else {
          order = 'created_at.desc';
        }

        console.log(
          '[SUPABASE] Final query params - select:',
          cleanSelect,
          'order:',
          order,
          'filters:',
          Object.keys(filters)
        );
        const result = await supabaseCall('GET', table, {
          select: cleanSelect,
          filters,
          order,
        });

        // Map aliases if needed
        if (Object.keys(aliasMap).length > 0 && Array.isArray(result)) {
          return result.map(row => {
            const mapped = {};
            Object.keys(row).forEach(key => {
              // If this column has an alias, use the alias; otherwise use original name
              const alias = aliasMap[key];
              mapped[alias || key] = row[key];
            });
            return mapped;
          });
        }

        return result;
      } catch (error) {
        console.error(`[SUPABASE] Query error:`, error);
        if (typeof normalizedSql !== 'undefined') {
          console.error(`[SUPABASE] SQL:`, normalizedSql.substring(0, 200));
        } else {
          console.error(`[SUPABASE] SQL:`, sql.substring(0, 200));
        }

        // If this is a table not found error for menu_dropdown_values,
        // preserve the error properties for proper handling upstream
        if (
          error?.table === 'menu_dropdown_values' ||
          error?.code === 'PGRST205' ||
          (error?.message &&
            error.message.includes('menu_dropdown_values') &&
            (error.message.includes('does not exist') ||
              error.message.includes('PGRST205')))
        ) {
          // Ensure error has table property for upstream handling
          if (!error.table && normalizedSql.includes('menu_dropdown_values')) {
            error.table = 'menu_dropdown_values';
          }
          if (
            !error.statusCode &&
            (error.message?.includes('404') || error.code === 'PGRST205')
          ) {
            error.statusCode = 404;
          }
          if (!error.code && error.message?.includes('PGRST205')) {
            error.code = 'PGRST205';
          }
        }

        throw error;
      }
    },

    async get(sql, params = []) {
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (selectMatch) {
        // Remove spaces after commas in select clause for Supabase
        const select = selectMatch[1].trim().replace(/\s*,\s*/g, ',');
        const table = selectMatch[2].trim();

        // Tables that don't have location_id column
        const tablesWithoutLocationId = ['recipe_ingredients', 'recipe_sales'];
        const filters = {};

        // Parse WHERE clause first to get all filters including location_id if present
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
        const whereClause = whereMatch ? whereMatch[1] : '';
        const parsedFilters = parseWhereClause(whereClause, params);

        // Check if location_id is already in parsed filters
        const hasLocationIdInParsedFilters = 'location_id' in parsedFilters;

        // Only add location_id automatically if:
        // 1. Table requires it (not in tablesWithoutLocationId)
        // 2. location_id is not already in WHERE clause (checked via parsedFilters)
        if (
          !tablesWithoutLocationId.includes(table) &&
          !hasLocationIdInParsedFilters
        ) {
          filters.location_id = locationId;
        }

        // Merge parsed filters (this will override location_id if it was set above, which is correct)
        Object.assign(filters, parsedFilters);

        return await supabaseCall('GET', table, {
          select,
          filters,
          single: true,
        });
      }

      throw new Error(`Unsupported SQL query: ${sql}`);
    },

    async run(sql, params = []) {
      // Normalize SQL: remove extra whitespace and newlines
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();

      // INSERT
      const insertMatch = normalizedSql.match(
        /INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s+VALUES\s*\((.+?)\)/i
      );
      if (insertMatch) {
        const table = insertMatch[1].trim();
        const columns = insertMatch[2]
          .split(',')
          .map(c => c.trim().replace(/^["']|["']$/g, '')); // Remove quotes from column names
        const placeholders = insertMatch[3].split(',').map(p => p.trim());

        // Tables that don't have location_id column
        const tablesWithoutLocationId = ['recipe_ingredients', 'recipe_sales'];
        const data = {};

        // Check if location_id is already in the columns list
        const hasLocationIdInColumns = columns.includes('location_id');

        // Only add location_id if the table requires it AND it's not already in the INSERT
        if (
          !tablesWithoutLocationId.includes(table) &&
          !hasLocationIdInColumns
        ) {
          data.location_id = locationId;
        }

        columns.forEach((col, index) => {
          if (placeholders[index] === '?' && params[index] !== undefined) {
            data[col] = params[index];
          }
        });

        console.log(
          `[SUPABASE] INSERT into ${table}:`,
          Object.keys(data).join(', ')
        );
        console.log(`[SUPABASE] INSERT data values:`, {
          columns: columns,
          paramsCount: params.length,
          dataKeys: Object.keys(data),
          locationIdInColumns: hasLocationIdInColumns,
          locationIdInData: 'location_id' in data,
          locationIdValue: data.location_id,
        });

        try {
          return await supabaseCall('POST', table, { data, upsert: false });
        } catch (error) {
          console.error(`[SUPABASE] INSERT error for table ${table}:`, error);
          console.error(`[SUPABASE] INSERT data that failed:`, JSON.stringify(data, null, 2));
          throw error;
        }
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
          const cleanCol = col.replace(/^["']|["']$/g, ''); // Remove quotes from column names
          if (val === '?') {
            data[cleanCol] = params[paramIndex++];
          }
        });

        // Tables that don't have location_id column
        const tablesWithoutLocationId = ['recipe_ingredients', 'recipe_sales'];
        const filters = {};

        // Parse WHERE clause first to get all filters including location_id if present
        const parsedFilters = parseWhereClause(
          whereClause,
          params.slice(paramIndex)
        );

        // Check if location_id is already in parsed filters
        const hasLocationIdInParsedFilters = 'location_id' in parsedFilters;

        // Only add location_id automatically if:
        // 1. Table requires it (not in tablesWithoutLocationId)
        // 2. location_id is not already in WHERE clause (checked via parsedFilters)
        if (
          !tablesWithoutLocationId.includes(table) &&
          !hasLocationIdInParsedFilters
        ) {
          filters.location_id = locationId;
        }

        // Merge parsed filters (this will override location_id if it was set above, which is correct)
        Object.assign(filters, parsedFilters);

        return await supabaseCall('PATCH', table, { data, filters });
      }

      // DELETE
      const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
      if (deleteMatch) {
        const table = deleteMatch[1].trim();
        const whereClause = deleteMatch[2];

        // Tables that don't have location_id column
        const tablesWithoutLocationId = ['recipe_ingredients', 'recipe_sales'];
        const filters = {};

        // Parse WHERE clause first to get all filters including location_id if present
        const parsedFilters = parseWhereClause(whereClause, params);

        // Check if location_id is already in parsed filters
        const hasLocationIdInParsedFilters = 'location_id' in parsedFilters;

        // Only add location_id automatically if:
        // 1. Table requires it (not in tablesWithoutLocationId)
        // 2. location_id is not already in WHERE clause (checked via parsedFilters)
        if (
          !tablesWithoutLocationId.includes(table) &&
          !hasLocationIdInParsedFilters
        ) {
          filters.location_id = locationId;
        }

        // Merge parsed filters (this will override location_id if it was set above, which is correct)
        Object.assign(filters, parsedFilters);

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
