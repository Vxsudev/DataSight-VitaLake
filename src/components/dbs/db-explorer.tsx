"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database as DbIcon, Folder, Table2, Loader2, ChevronRight } from 'lucide-react';
import { getDatabases, getSchemas, getTables } from '@/lib/data';
import type { Database, Schema, Table } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

interface DbExplorerProps {
  activeItem?: {
    dbId?: string;
    schemaId?: string;
    tableId?: string;
  };
  selectedDbId?: string; // When provided, only show this database
}

export function DbExplorer({ activeItem, selectedDbId }: DbExplorerProps) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [schemas, setSchemas] = useState<Record<string, Schema[]>>({});
  const [tables, setTables] = useState<Record<string, Table[]>>({});
  const [loading, setLoading] = useState({
    dbs: true,
    schemas: new Set<string>(),
    tables: new Set<string>(),
  });

  useEffect(() => {
    async function fetchDbs() {
      setLoading(prev => ({ ...prev, dbs: true }));
      try {
        const dbs = await getDatabases();
        setDatabases(dbs);
        
        // If selectedDbId is provided and exists, auto-load its schemas
        if (selectedDbId && dbs.find(db => db.id === selectedDbId)) {
          handleDbToggle(selectedDbId, true);
        }
      } catch (error) {
        console.error("Failed to fetch databases", error);
      } finally {
        setLoading(prev => ({ ...prev, dbs: false }));
      }
    }
    fetchDbs();
  }, [selectedDbId]);

  const handleDbToggle = async (dbId: string, open: boolean) => {
    if (open && !schemas[dbId]) {
      setLoading(prev => ({ ...prev, schemas: new Set(prev.schemas).add(dbId) }));
      try {
        const fetchedSchemas = await getSchemas(dbId);
        setSchemas(prev => ({ ...prev, [dbId]: fetchedSchemas }));
      } catch (error) {
        console.error("Failed to fetch schemas", error);
      } finally {
        setLoading(prev => {
          const newSchemas = new Set(prev.schemas);
          newSchemas.delete(dbId);
          return { ...prev, schemas: newSchemas };
        });
      }
    }
  };

  const handleSchemaToggle = async (schemaId: string, dbId: string, open: boolean) => {
    if (open && !tables[schemaId]) {
      setLoading(prev => ({ ...prev, tables: new Set(prev.tables).add(schemaId) }));
      try {
        const fetchedTables = await getTables(schemaId, dbId);
        setTables(prev => ({ ...prev, [schemaId]: fetchedTables }));
      } catch (error) {
        console.error("Failed to fetch tables", error);
      } finally {
        setLoading(prev => {
          const newTables = new Set(prev.tables);
          newTables.delete(schemaId);
          return { ...prev, tables: newTables };
        });
      }
    }
  };

  const isDbOpen = (dbId: string): boolean => {
    if (selectedDbId) {
      return dbId === selectedDbId; // Auto-open the selected database
    }
    return !!(activeItem?.dbId === dbId && (activeItem.schemaId || activeItem.tableId));
  };
  
  const isSchemaOpen = (schemaId: string): boolean => {
    return !!(activeItem?.schemaId === schemaId && activeItem.tableId);
  };

  if (loading.dbs) {
    return <DbExplorerSkeleton />;
  }

  // Filter databases if selectedDbId is provided
  const displayedDatabases = selectedDbId 
    ? databases.filter(db => db.id === selectedDbId)
    : databases;

  return (
    <div className="space-y-1 pr-1">
      {displayedDatabases.map(db => (
        <Collapsible key={db.id} onOpenChange={(open) => handleDbToggle(db.id, open)} defaultOpen={isDbOpen(db.id)}>
          <CollapsibleTrigger asChild>
            <div className={cn(
              "group flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-sm hover:bg-accent",
              activeItem?.dbId === db.id && !activeItem.schemaId && "bg-accent"
            )}>
              <Link href={`/dbs/${db.id}`} className="flex items-center gap-2">
                <DbIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">{db.name}</span>
              </Link>
              <div className="flex items-center gap-1">
                {loading.schemas.has(db.id) && <Loader2 className="h-4 w-4 animate-spin" />}
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4">
            {schemas[db.id]?.map(schema => (
              <Collapsible key={schema.id} onOpenChange={(open) => handleSchemaToggle(schema.id, db.id, open)} defaultOpen={isSchemaOpen(schema.id)}>
                <CollapsibleTrigger asChild>
                   <div className={cn(
                    "group mt-1 flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-sm hover:bg-accent",
                    activeItem?.schemaId === schema.id && !activeItem.tableId && "bg-accent"
                  )}>
                    <Link href={`/dbs/${db.id}/${schema.id}`} className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-primary" />
                      <span>{schema.name}</span>
                    </Link>
                    <div className="flex items-center gap-1">
                      {loading.tables.has(schema.id) && <Loader2 className="h-4 w-4 animate-spin" />}
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6">
                  {tables[schema.id]?.map(table => (
                    <Link key={table.id} href={`/dbs/${db.id}/${schema.id}/${table.id}`}>
                      <div className={cn(
                          "mt-1 flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent",
                          activeItem?.tableId === table.id && "bg-accent"
                      )}>
                        <Table2 className="h-4 w-4 text-primary" />
                        <span>{table.name}</span>
                      </div>
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

function DbExplorerSkeleton() {
  return (
    <div className="space-y-2 pr-1">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md p-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
