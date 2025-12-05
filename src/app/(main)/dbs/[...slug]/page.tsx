'use client';

import { useState, useEffect, use } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Table2, Loader2 } from 'lucide-react';
import { TableView } from '@/components/dbs/table-view';
import type { Table, Column, QueryResult } from '@/lib/types';

type Database = {
  id: string;
  name: string;
};

type Schema = {
  id: string;
  name: string;
  databaseId: string;
};

type TableListItem = {
  id: string;
  name: string;
  schemaId: string;
};

type DbPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

export default function DbPage({ params }: DbPageProps) {
  // Use React.use() to unwrap the params Promise
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  
  const [database, setDatabase] = useState<Database | null>(null);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [tables, setTables] = useState<TableListItem[]>([]);
  const [currentTable, setCurrentTable] = useState<Table | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update document title when database is loaded
  useEffect(() => {
    if (database && slug.length > 0) {
      const [dbId, schemaId, tableId] = slug;
      if (slug.length === 1) {
        document.title = `${database.name} - DataSight for VitaLake`;
      } else if (slug.length === 2) {
        document.title = `${schemaId} Schema - ${database.name} - DataSight for VitaLake`;
      } else if (slug.length === 3) {
        document.title = `${tableId} Table - ${schemaId} Schema - ${database.name} - DataSight for VitaLake`;
      }
    }
  }, [database, slug]);

  useEffect(() => {
    if (slug.length === 0) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [dbId, schemaId, tableId] = slug;

        // Load the database info
        const dbResponse = await fetch('/api/dbs');
        if (!dbResponse.ok) throw new Error('Failed to fetch databases');
        const databases = await dbResponse.json();
        const db = databases.find((d: Database) => d.id === dbId);
        
        if (!db) {
          throw new Error('Database not found');
        }
        setDatabase(db);

        if (slug.length === 1) {
          // Load schemas
          const schemaResponse = await fetch(`/api/dbs/${dbId}/schemas`);
          if (!schemaResponse.ok) throw new Error('Failed to fetch schemas');
          const schemasData = await schemaResponse.json();
          setSchemas(schemasData);
        } else if (slug.length === 2) {
          // Load tables
          const tablesResponse = await fetch(`/api/dbs/${dbId}/schemas/${schemaId}/tables`);
          if (!tablesResponse.ok) throw new Error('Failed to fetch tables');
          const tablesData = await tablesResponse.json();
          setTables(tablesData);
        } else if (slug.length === 3) {
          // Load table columns and initial data
          const [columnsResponse, dataResponse] = await Promise.all([
            fetch(`/api/dbs/${dbId}/schemas/${schemaId}/tables/${tableId}/columns`),
            fetch(`/api/dbs/${dbId}/schemas/${schemaId}/tables/${tableId}/data?limit=500`)
          ]);
          
          if (!columnsResponse.ok) throw new Error('Failed to fetch table columns');
          if (!dataResponse.ok) throw new Error('Failed to fetch table data');
          
          const columns = await columnsResponse.json();
          const data = await dataResponse.json();
          
          const table: Table = {
            id: tableId,
            name: tableId,
            schemaId: schemaId,
            columns: columns || []
          };
          
          setCurrentTable(table);
          setTableData(data);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-blue-600 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Database not found</p>
      </div>
    );
  }

  const [dbId, schemaId, tableId] = slug;

  let content;
  if (slug.length === 1) {
    content = (
      <div>
        <PageHeader title={database.name} description="Select a schema to view its tables." />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schemas.map(schema => (
            <Link href={`/dbs/${dbId}/${schema.id}`} key={schema.id}>
              <Card className="transition-colors hover:bg-card/60 hover:border-accent">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Folder className="h-6 w-6 text-primary" />
                  <CardTitle>{schema.name}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  } else if (slug.length === 2) {
    content = (
      <div>
        <PageHeader title={`${schemaId} Schema`} description={`Tables in the ${database.name} database`} />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map(table => (
            <Link href={`/dbs/${dbId}/${schemaId}/${table.id}`} key={table.id}>
              <Card className="transition-colors hover:bg-card/60 hover:border-accent">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Table2 className="h-6 w-6 text-primary" />
                  <CardTitle>{table.name}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  } else if (slug.length === 3) {
    if (currentTable && tableData) {
      content = <TableView dbId={dbId} schemaId={schemaId} table={currentTable} initialData={tableData} />;
    } else {
      content = (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading table data...</span>
        </div>
      );
    }
  }

  return content;
}
