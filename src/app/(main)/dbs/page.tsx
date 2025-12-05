'use client';

import Link from 'next/link';
import { getDatabases } from '@/lib/data';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { Database as DatabaseType } from '@/lib/types';

function DatabaseList() {
  const [databases, setDatabases] = useState<DatabaseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDatabases() {
      try {
        setLoading(true);
        setError(null);
        const dbs = await getDatabases();
        setDatabases(dbs);
      } catch (err: any) {
        console.error('Failed to load databases:', err);
        setError(err.message || 'Failed to load databases');
      } finally {
        setLoading(false);
      }
    }

    loadDatabases();
  }, []);

  if (loading) {
    return <DatabaseListSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Databases</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {databases.map((db) => (
        <Link href={`/dbs/${db.id}`} key={db.id}>
          <Card className="h-full transition-colors hover:bg-card/60 hover:border-accent">
            <CardHeader className="flex flex-row items-center gap-4">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>{db.name}</CardTitle>
                <CardDescription>Database</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function DatabaseListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export default function DatabasesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Databases"
        description="Select a database connection to explore its schemas and tables."
      />
      <DatabaseList />
    </div>
  );
}
