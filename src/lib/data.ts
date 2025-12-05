import type { Database, Schema, Table, QueryResult, Dashboard, ChartDefinition, Column } from './types';

// Helper function to handle API requests
async function fetchFromApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  
  // If we're on the server side and no base URL is provided, use localhost
  if (!baseUrl && typeof window === 'undefined') {
    baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : 'http://localhost:9002';
  }
  
  const url = `${baseUrl}/api/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store', // Ensure dynamic data fetching
  });

  if (!response.ok) {
    const errorResult = await response.json();
    throw new Error(errorResult.error || `Failed to fetch from ${endpoint}`);
  }

  return response.json();
}


const charts: ChartDefinition[] = [
  { id: 'chart-1', name: 'Users Over Time', type: 'line', data: [
    { date: '2023-01-01', users: 10 }, { date: '2023-01-02', users: 15 }, { date: '2023-01-03', users: 12 },
    { date: '2023-01-04', users: 20 }, { date: '2023-01-05', users: 25 }, { date: '2023-01-06', users: 22 },
  ], config: { xAxis: 'date', yAxis: ['users'] } },
  { id: 'chart-2', name: 'Sales by Category', type: 'bar', data: [
    { category: 'Laptops', sales: 4000 }, { category: 'Accessories', sales: 1500 }, { category: 'Monitors', sales: 2500 }
  ], config: { xAxis: 'category', yAxis: ['sales'] } },
];

const dashboards: Dashboard[] = [
    {id: 'd1', name: 'Sales Performance', description: 'Overview of company sales.', items: [
        {id: 'item-1', chartId: 'chart-2', position: {x: 0, y: 0, w: 2, h: 1}},
    ]},
    {id: 'd2', name: 'User Engagement', description: 'Tracks user activity and growth.', items: [
        {id: 'item-2', chartId: 'chart-1', position: {x: 0, y: 0, w: 2, h: 1}},
    ]},
];

export const getDatabases = async (): Promise<Database[]> => {
  return fetchFromApi<Database[]>('dbs');
};

export const getDatabase = async (dbId: string): Promise<Database | undefined> => {
    const dbs = await getDatabases();
    return dbs.find(db => db.id === dbId);
}

export const getSchemas = async (databaseId: string): Promise<Schema[]> => {
  return fetchFromApi<Schema[]>(`dbs/${databaseId}/schemas`);
};

export const getTables = async (schemaId: string, dbId: string = 'primary'): Promise<Table[]> => {
  return fetchFromApi<Table[]>(`dbs/${dbId}/schemas/${schemaId}/tables`);
};

export const getTable = async (tableId: string, schemaId: string, dbId: string = 'primary'): Promise<Table | undefined> => {
    const response = await fetchFromApi<Column[]>(`dbs/${dbId}/schemas/${schemaId}/tables/${tableId}/columns`);
    return {
      id: tableId,
      name: tableId,
      schemaId: schemaId,
      columns: response
    };
}

export const getTableData = async (tableName: string, schemaId: string, dbId: string = 'primary', limit: number = 500): Promise<QueryResult> => {
  return fetchFromApi<QueryResult>(`dbs/${dbId}/schemas/${schemaId}/tables/${tableName}/data?limit=${limit}`);
};

export const runSql = async (sql: string, dbId?: string): Promise<QueryResult> => {
  let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  
  // If we're on the server side and no base URL is provided, use localhost
  if (!baseUrl && typeof window === 'undefined') {
    baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : 'http://localhost:9002';
  }
  
  const response = await fetch(`${baseUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: sql,
      dbId: dbId 
    }),
  });

  if (!response.ok) {
    const errorResult = await response.json();
    // Include status code in error message for better error handling
    const error = new Error(errorResult.error || 'Failed to execute query');
    (error as any).statusCode = response.status;
    throw error;
  }

  const result: QueryResult = await response.json();
  
  const dateColumns = result.columns
    .filter(col => col.type === 'timestamp' || col.type === 'date' || col.type === 'timestamptz')
    .map(col => col.name);

  if (dateColumns.length > 0) {
    result.rows = result.rows.map(row => {
      const newRow = { ...row };
      for (const colName of dateColumns) {
        if (newRow[colName] && typeof newRow[colName] === 'string') {
          try {
            newRow[colName] = new Date(newRow[colName]).toLocaleString();
          } catch (e) {
            // Ignore if date is invalid
          }
        }
      }
      return newRow;
    });
  }

  return result;
};


export const getDashboards = async (): Promise<Dashboard[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return dashboards;
}

export const getDashboard = async (dashboardId: string): Promise<Dashboard | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return dashboards.find(d => d.id === dashboardId);
}

export const getChart = async (chartId: string): Promise<ChartDefinition | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return charts.find(c => c.id === chartId);
}
