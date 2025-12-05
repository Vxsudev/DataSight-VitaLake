'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { getTableData, runSql } from '@/lib/data';
import type { Table as TableType, QueryResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DataTable } from './data-table';
import { ErrorPopup, useErrorNotifications } from '@/components/shared/error-popup';
import { Code2, Loader2, ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw } from 'lucide-react';
import { PageHeader } from '../shared/page-header';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ColumnFilter } from './smart-column-filter';

interface TableViewProps {
  dbId: string;
  schemaId: string;
  table: TableType;
  initialData: QueryResult;
}

export function TableView({ dbId, schemaId, table, initialData }: TableViewProps) {
  const [data, setData] = useState<QueryResult>(initialData);
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [jumpToPage, setJumpToPage] = useState('');
  const [filters, setFilters] = useState<ColumnFilter[]>([]);

  // Error notification system
  const { errors, addError, dismissError, dismissAll } = useErrorNotifications();
  
  // Fetch initial total count when component mounts
  useEffect(() => {
    fetchTotalCount(false); // Fetch total without any filters initially
  }, []);
  
  // Build SQL query with filters
  const buildSqlQuery = (includeLimit = true, countOnly = false) => {
    let query = countOnly 
      ? `SELECT COUNT(*) as total FROM "${schemaId}"."${table.name}"` 
      : `SELECT * FROM "${schemaId}"."${table.name}"`;
    
    // Add WHERE clause if filters exist
    if (filters.length > 0) {
      const whereConditions = filters.map(filter => {
        const columnName = `"${filter.column}"`;
        
        switch (filter.operator) {
          case 'equals':
            return filter.value === '' 
              ? `${columnName} IS NULL` 
              : `${columnName} = '${filter.value.replace(/'/g, "''")}'`;
          case 'not_equals':
            return filter.value === '' 
              ? `${columnName} IS NOT NULL` 
              : `${columnName} != '${filter.value.replace(/'/g, "''")}'`;
          case 'contains':
            return `${columnName}::text ILIKE '%${filter.value.replace(/'/g, "''")}%'`;
          case 'not_contains':
            return `${columnName}::text NOT ILIKE '%${filter.value.replace(/'/g, "''")}%'`;
          case 'is_null':
            return `${columnName} IS NULL`;
          case 'is_not_null':
            return `${columnName} IS NOT NULL`;
          default:
            return '';
        }
      }).filter(Boolean);
      
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }
    
    if (!countOnly) {
      query += ` ORDER BY 1`;
      if (includeLimit) {
        const offset = (currentPage - 1) * pageSize;
        query += ` LIMIT ${pageSize} OFFSET ${offset}`;
      }
    }
    
    return query;
  };

  const sqlQuery = buildSqlQuery(false, false);
  const encodedQuery = encodeURIComponent(sqlQuery);

  // Fetch total row count with filters applied
  const fetchTotalCount = async (withFilters = true) => {
    try {
      const countQuery = withFilters ? buildSqlQuery(false, true) : `SELECT COUNT(*) as total FROM "${schemaId}"."${table.name}"`;
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: countQuery,
          dbId: dbId 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Query API error:', result);
        addError(response.status, 'Failed to count table rows', result.error || 'Database query failed');
        return null;
      }
      
      if (!result || !result.rows || !Array.isArray(result.rows) || result.rows.length === 0) {
        console.error('Invalid result format:', result);
        addError(500, 'Invalid response format', 'Server returned unexpected data format');
        return null;
      }
      
      const count = parseInt(result.rows[0]?.total || '0');
      setTotalRows(count);
      return count;
    } catch (error: any) {
      console.error('Failed to fetch total count:', error);
      addError(
        error.statusCode || 500, 
        'Failed to fetch total row count', 
        error.message || 'Unable to count table rows'
      );
      return null;
    }
  };

  const loadPage = (page: number, newPageSize?: number, resetFilters = false) => {
    const size = newPageSize || pageSize;
    
    startTransition(async () => {
      try {
        // Reset filters if requested
        const currentFilters = resetFilters ? [] : filters;
        if (resetFilters) {
          setFilters([]);
        }
        
        // Load data with current/reset filters
        await loadPageWithFilters(page, size, currentFilters);
        
        // Update page size if provided
        if (newPageSize) setPageSize(newPageSize);
        
        // Fetch total count with current/reset filters
        await fetchTotalCountWithFilters(currentFilters);
      } catch (error: any) {
        console.error('Failed to load page:', error);
        addError(
          error.statusCode || 500, 
          'Failed to load table page', 
          error.message || 'Unable to load table data'
        );
      }
    });
  };

  // Helper function to load page data with specific filters
  const loadPageWithFilters = async (page: number, size: number, currentFilters: ColumnFilter[]) => {
    const offset = (page - 1) * size;
    
    let query = `SELECT * FROM "${schemaId}"."${table.name}"`;
    
    // Add WHERE clause if filters exist
    if (currentFilters.length > 0) {
      const whereConditions = currentFilters.map(filter => {
        const columnName = `"${filter.column}"`;
        
        switch (filter.operator) {
          case 'equals':
            return filter.value === '' 
              ? `${columnName} IS NULL` 
              : `${columnName} = '${filter.value.replace(/'/g, "''")}'`;
          case 'not_equals':
            return filter.value === '' 
              ? `${columnName} IS NOT NULL` 
              : `${columnName} != '${filter.value.replace(/'/g, "''")}'`;
          case 'contains':
            return `${columnName}::text ILIKE '%${filter.value.replace(/'/g, "''")}%'`;
          case 'not_contains':
            return `${columnName}::text NOT ILIKE '%${filter.value.replace(/'/g, "''")}%'`;
          case 'is_null':
            return `${columnName} IS NULL`;
          case 'is_not_null':
            return `${columnName} IS NOT NULL`;
          default:
            return '';
        }
      }).filter(Boolean);
      
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }
    
    query += ` ORDER BY 1 LIMIT ${size} OFFSET ${offset}`;
    
    // Execute the query using SQL endpoint for better filter support
    const newData = await runSql(query, dbId);
    setData(newData);
    setCurrentPage(page);
  };

  // Helper function to fetch total count with specific filters
  const fetchTotalCountWithFilters = async (currentFilters: ColumnFilter[]) => {
    try {
      let countQuery = `SELECT COUNT(*) as total FROM "${schemaId}"."${table.name}"`;
      
      // Add WHERE clause if filters exist
      if (currentFilters.length > 0) {
        const whereConditions = currentFilters.map(filter => {
          const columnName = `"${filter.column}"`;
          
          switch (filter.operator) {
            case 'equals':
              return filter.value === '' 
                ? `${columnName} IS NULL` 
                : `${columnName} = '${filter.value.replace(/'/g, "''")}'`;
            case 'not_equals':
              return filter.value === '' 
                ? `${columnName} IS NOT NULL` 
                : `${columnName} != '${filter.value.replace(/'/g, "''")}'`;
            case 'contains':
              return `${columnName}::text ILIKE '%${filter.value.replace(/'/g, "''")}%'`;
            case 'not_contains':
              return `${columnName}::text NOT ILIKE '%${filter.value.replace(/'/g, "''")}%'`;
            case 'is_null':
              return `${columnName} IS NULL`;
            case 'is_not_null':
              return `${columnName} IS NOT NULL`;
            default:
              return '';
          }
        }).filter(Boolean);
        
        if (whereConditions.length > 0) {
          countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
        }
      }
      
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: countQuery,
          dbId: dbId 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Query API error:', result);
        return null;
      }
      
      if (!result || !result.rows || !Array.isArray(result.rows) || result.rows.length === 0) {
        console.error('Invalid result format:', result);
        return null;
      }
      
      const count = parseInt(result.rows[0]?.total || '0');
      setTotalRows(count);
      return count;
    } catch (error: any) {
      console.error('Failed to fetch total count:', error);
      addError(
        error.statusCode || 500, 
        'Failed to count filtered rows', 
        error.message || 'Unable to count table rows with current filters'
      );
      return null;
    }
  };

  const handleFilterChange = (newFilters: ColumnFilter[]) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
    
    // Use startTransition to coordinate both data loading and count fetching
    startTransition(async () => {
      try {
        // Load page data with the new filters
        await loadPageWithFilters(1, pageSize, newFilters);
        
        // Fetch new total count with the new filters
        await fetchTotalCountWithFilters(newFilters);
      } catch (error: any) {
        console.error('Failed to apply filters:', error);
        addError(
          error.statusCode || 500, 
          'Failed to apply table filters', 
          error.message || 'Unable to filter table data'
        );
      }
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    loadPage(1, newSize); // Go to page 1 with new page size
  };

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage);
    if (page > 0 && (!totalRows || page <= Math.ceil(totalRows / pageSize))) {
      loadPage(page);
      setJumpToPage('');
    }
  };

  // Refresh data and counts from backend
  const handleRefresh = () => {
    startTransition(async () => {
      try {
        // Reset to page 1 and reload current data
        setCurrentPage(1);
        loadPage(1, pageSize, false); // This will reload the data
        
        // Always fetch the total count (with current filters applied)
        await fetchTotalCount(filters.length > 0);
      } catch (error: any) {
        console.error('Failed to refresh data:', error);
        addError(
          error.statusCode || 500, 
          'Failed to refresh table data', 
          error.message || 'Unable to refresh table view'
        );
      }
    });
  };

  const totalPages = totalRows ? Math.ceil(totalRows / pageSize) : null;
  const canGoNext = !totalPages || currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  return (
    <>
      {/* Error Notifications */}
      <ErrorPopup 
        errors={errors}
        onDismiss={dismissError}
        onDismissAll={dismissAll}
      />
      
      <div className="flex h-full flex-col gap-4 w-full min-w-0 overflow-hidden">
      <PageHeader
        title={table.name}
        description={
          totalRows !== null 
            ? `${totalRows.toLocaleString()} ${filters.length > 0 ? 'filtered' : 'total'} rows • Page ${currentPage}${totalPages ? ` of ${totalPages.toLocaleString()}` : ''} • ${table.columns.length} columns${filters.length > 0 ? ` • ${filters.length} filter${filters.length > 1 ? 's' : ''} applied` : ''}`
            : `Loading total count... • ${data.rows.length} rows shown on page • ${table.columns.length} columns${filters.length > 0 ? ` • ${filters.length} filter${filters.length > 1 ? 's' : ''} applied` : ''}`
        }
      >
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isPending}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
            Refresh
          </Button>
          {filters.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => {
                setFilters([]);
                setCurrentPage(1);
                loadPage(1, pageSize, true); // Reset filters and reload
                fetchTotalCount(false); // Get total count without filters
              }}
              size="sm"
            >
              Clear Filters ({filters.length})
            </Button>
          )}
          <Button asChild>
            <Link href={`/sql-studio?query=${encodedQuery}`}>
              <Code2 className="mr-2 h-4 w-4" />
              Query in SQL Studio
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between gap-4 px-1 py-2 border rounded-md bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            className="px-2 py-1 border rounded text-sm bg-background"
            disabled={isPending}
          >
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1,000</option>
            <option value={2000}>2,000</option>
            <option value={5000}>5,000</option>
            <option value={10000}>10,000</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(currentPage - 1)}
            disabled={!canGoPrev || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span>Page</span>
            <Input
              type="number"
              value={jumpToPage || currentPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
              className="w-16 h-8 text-center"
              min={1}
              max={totalPages || undefined}
              disabled={isPending}
            />
            {totalPages && <span>of {totalPages.toLocaleString()}</span>}
            {jumpToPage && (
              <Button size="sm" variant="ghost" onClick={handleJumpToPage}>
                Go
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(currentPage + 1)}
            disabled={!canGoNext || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>

          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {totalRows && (
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, totalRows).toLocaleString()} of {totalRows.toLocaleString()} rows
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <DataTable 
          columns={data.columns} 
          rows={data.rows}
          className="h-full w-full"
          currentPage={currentPage}
          pageSize={pageSize}
          totalRows={totalRows || undefined}
          dbId={dbId}
          schemaId={schemaId}
          tableId={table.name}
          onFilterChange={handleFilterChange}
          filters={filters}
        />
      </div>
    </div>
    </>
  );
}
