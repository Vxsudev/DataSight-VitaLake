"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type Database = {
  id: string;
  name: string;
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const [databases, setDatabases] = useState<Database[]>([]);

  useEffect(() => {
    // Load databases to map IDs to names
    const loadDatabases = async () => {
      try {
        const response = await fetch('/api/dbs');
        if (response.ok) {
          const dbData = await response.json();
          setDatabases(dbData);
        }
      } catch (error) {
        console.error('Failed to load databases for breadcrumbs:', error);
      }
    };

    if (segments.includes('dbs') && segments.length > 1) {
      loadDatabases();
    }
  }, [segments]);

  if (segments.length === 0) {
    return null;
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    let name = segment.replace(/-/g, ' ');

    // Special handling for database routes
    if (segments[0] === 'dbs' && index > 0) {
      const [, dbId, schemaId, tableId] = segments;
      
      if (index === 1) {
        // This is a database ID - replace with database name
        const database = databases.find(db => db.id === segment);
        name = database ? database.name : segment;
      } else if (index === 2) {
        // This is a schema name - keep as is but format nicely
        name = segment + ' schema';
      } else if (index === 3) {
        // This is a table name - keep as is but format nicely
        name = segment + ' table';
      }
    }

    return (
      <React.Fragment key={href}>
        <li>
          <div className="flex items-center">
            <ChevronRight className="h-4 w-4 shrink-0" />
            <Link
              href={href}
              className={cn(
                'ml-4 text-sm font-medium capitalize text-muted-foreground hover:text-foreground',
                isLast && 'pointer-events-none text-foreground'
              )}
              aria-current={isLast ? 'page' : undefined}
            >
              {name}
            </Link>
          </div>
        </li>
      </React.Fragment>
    );
  });

  return (
    <nav className="hidden md:flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        {breadcrumbs}
      </ol>
    </nav>
  );
}
