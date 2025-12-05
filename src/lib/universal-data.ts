/**
 * Universal Data Fetching Service
 * 
 * This service provides methods to fetch data from any database, schema, table, and column
 * across all present and future database connections.
 */

export interface UniversalDataFetchConfig {
  dbId: string;
  schemaId: string;
  tableId: string;
  columnName?: string;
}

export interface DistinctValue {
  value: string | null;
  count: number;
  displayValue: string;
}

export interface DistinctValuesResult {
  column: string;
  values: DistinctValue[];
  totalDistinct: number;
  hasMore: boolean;
}

export interface TableData {
  columns: Array<{ name: string; type: string }>;
  rows: Record<string, any>[];
  totalRows?: number;
  hasMore?: boolean;
}

/**
 * Fetch distinct values for any column in any database/schema/table
 */
export async function fetchDistinctValues(
  config: UniversalDataFetchConfig & { columnName: string },
  options: {
    limit?: number;
    searchTerm?: string;
  } = {}
): Promise<DistinctValuesResult> {
  const { dbId, schemaId, tableId, columnName } = config;
  const { limit = 100, searchTerm } = options;
  
  const url = new URL(`/api/dbs/${dbId}/schemas/${schemaId}/tables/${tableId}/columns/${encodeURIComponent(columnName)}/distinct`, window.location.origin);
  url.searchParams.set('limit', limit.toString());
  
  if (searchTerm && searchTerm.trim()) {
    url.searchParams.set('search', searchTerm.trim());
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Always fetch fresh data for filters
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch distinct values for ${columnName}`);
  }
  
  return response.json();
}

/**
 * Fetch table data with optional filtering
 */
export async function fetchTableData(
  config: UniversalDataFetchConfig,
  options: {
    limit?: number;
    offset?: number;
    filters?: Array<{ column: string; operator: string; value: string }>;
    orderBy?: { column: string; direction: 'asc' | 'desc' };
  } = {}
): Promise<TableData> {
  const { dbId, schemaId, tableId } = config;
  const { limit = 500, offset = 0, filters = [], orderBy } = options;
  
  const url = new URL(`/api/dbs/${dbId}/schemas/${schemaId}/tables/${tableId}/data`, window.location.origin);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('offset', offset.toString());
  
  if (filters.length > 0) {
    url.searchParams.set('filters', JSON.stringify(filters));
  }
  
  if (orderBy) {
    url.searchParams.set('orderBy', JSON.stringify(orderBy));
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch data from ${schemaId}.${tableId}`);
  }
  
  return response.json();
}

/**
 * Get all databases
 */
export async function fetchAllDatabases(): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch('/api/dbs', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch databases');
  }
  
  return response.json();
}

/**
 * Get all schemas for a database
 */
export async function fetchSchemas(dbId: string): Promise<Array<{ id: string; name: string; databaseId: string }>> {
  const response = await fetch(`/api/dbs/${dbId}/schemas`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch schemas for database ${dbId}`);
  }
  
  return response.json();
}

/**
 * Get all tables for a schema
 */
export async function fetchTables(dbId: string, schemaId: string): Promise<Array<{ id: string; name: string; schemaId: string }>> {
  const response = await fetch(`/api/dbs/${dbId}/schemas/${schemaId}/tables`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tables for schema ${schemaId}`);
  }
  
  return response.json();
}

/**
 * Get all columns for a table
 */
export async function fetchColumns(dbId: string, schemaId: string, tableId: string): Promise<Array<{ name: string; type: string }>> {
  const response = await fetch(`/api/dbs/${dbId}/schemas/${schemaId}/tables/${tableId}/columns`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch columns for table ${tableId}`);
  }
  
  return response.json();
}

/**
 * Universal search across all databases, schemas, tables, and columns
 */
export async function universalSearch(
  searchTerm: string,
  options: {
    dbIds?: string[];
    schemaNames?: string[];
    tableNames?: string[];
    columnNames?: string[];
    includeData?: boolean;
  } = {}
): Promise<{
  databases: Array<{ id: string; name: string }>;
  schemas: Array<{ id: string; name: string; databaseId: string }>;
  tables: Array<{ id: string; name: string; schemaId: string; databaseId: string }>;
  columns: Array<{ name: string; type: string; tableId: string; schemaId: string; databaseId: string }>;
  data?: Array<{ table: string; rows: any[] }>;
}> {
  const { dbIds, schemaNames, tableNames, columnNames, includeData = false } = options;
  
  try {
    // Get all databases first
    const databases = await fetchAllDatabases();
    const filteredDatabases = dbIds ? databases.filter(db => dbIds.includes(db.id)) : databases;
    
    const results = {
      databases: filteredDatabases.filter(db => 
        db.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
      schemas: [] as any[],
      tables: [] as any[],
      columns: [] as any[],
      data: [] as any[],
    };
    
    // Search across all databases
    for (const db of filteredDatabases) {
      try {
        const schemas = await fetchSchemas(db.id);
        const filteredSchemas = schemaNames ? 
          schemas.filter(s => schemaNames.includes(s.name)) : 
          schemas;
          
        // Add matching schemas
        results.schemas.push(...filteredSchemas.filter(schema =>
          schema.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).map(s => ({ ...s, databaseId: db.id })));
        
        // Search tables and columns in each schema
        for (const schema of filteredSchemas) {
          try {
            const tables = await fetchTables(db.id, schema.id);
            const filteredTables = tableNames ?
              tables.filter(t => tableNames.includes(t.name)) :
              tables;
              
            // Add matching tables
            results.tables.push(...filteredTables.filter(table =>
              table.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(t => ({ ...t, databaseId: db.id })));
            
            // Search columns in each table
            for (const table of filteredTables) {
              try {
                const columns = await fetchColumns(db.id, schema.id, table.id);
                const filteredColumns = columnNames ?
                  columns.filter(c => columnNames.includes(c.name)) :
                  columns;
                  
                // Add matching columns
                results.columns.push(...filteredColumns.filter(column =>
                  column.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(c => ({ 
                  ...c, 
                  tableId: table.id, 
                  schemaId: schema.id, 
                  databaseId: db.id 
                })));
                
                // Optionally search data
                if (includeData && filteredColumns.length > 0) {
                  try {
                    const tableData = await fetchTableData({
                      dbId: db.id,
                      schemaId: schema.id,
                      tableId: table.id
                    }, { limit: 100 });
                    
                    // Search for the term in the actual data
                    const matchingRows = tableData.rows.filter(row =>
                      Object.values(row).some(value =>
                        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
                      )
                    );
                    
                    if (matchingRows.length > 0) {
                      results.data!.push({
                        table: `${db.name}.${schema.name}.${table.name}`,
                        rows: matchingRows.slice(0, 10) // Limit results
                      });
                    }
                  } catch (error) {
                    console.warn(`Failed to search data in ${table.name}:`, error);
                  }
                }
              } catch (error) {
                console.warn(`Failed to fetch columns for table ${table.name}:`, error);
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch tables for schema ${schema.name}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch schemas for database ${db.name}:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Universal search failed:', error);
    throw error;
  }
}
