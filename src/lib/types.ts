export type Database = {
  id: string;
  name: string;
};

export type Schema = {
  id: string;
  name: string;
  databaseId: string;
};

export type Table = {
  id: string;
  name: string;
  schemaId: string;
  columns: Column[];
};

export type Column = {
  name: string;
  type: 'varchar' | 'integer' | 'timestamp' | 'date' | 'timestamptz' | 'boolean' | 'float';
};

export type QueryResult = {
  columns: Column[];
  rows: Record<string, any>[];
};

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'table';

export type ChartDefinition = {
  id: string;
  name: string;
  type: ChartType;
  queryId?: string;
  data: Record<string, any>[];
  config: {
    xAxis: string;
    yAxis: string[];
  };
};

export type DashboardItem = {
  id: string;
  chartId: string;
  position: { x: number; y: number; w: number; h: number };
};

export type Dashboard = {
  id: string;
  name: string;
  description: string;
  items: DashboardItem[];
};
