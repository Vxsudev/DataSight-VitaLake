"use client";

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ColumnFilterPopover, ActiveFilters, type ColumnFilter } from './smart-column-filter';

interface DataColumn {
  name: string;
  type: string;
}

interface DataTableProps {
  columns: DataColumn[];
  rows: Record<string, any>[];
  className?: string;
  currentPage?: number;
  pageSize?: number;
  totalRows?: number;
  dbId?: string;
  schemaId?: string;
  tableId?: string;
  onFilterChange?: (filters: ColumnFilter[]) => void;
  filters?: ColumnFilter[];
}

export function DataTable({ 
  columns, 
  rows, 
  className, 
  currentPage = 1, 
  pageSize = 500, 
  totalRows, 
  dbId, 
  schemaId, 
  tableId, 
  onFilterChange, 
  filters: parentFilters
}: DataTableProps) {
  const [filters, setFilters] = useState<ColumnFilter[]>(parentFilters || []);
  const [selectedCell, setSelectedCell] = useState<{column: string, value: string} | null>(null);

  // Calculate column widths based on content
  const columnWidths = useMemo(() => {
    return columns.map((column) => {
      const headerLength = column.name.length;
      const sampleValues = rows.slice(0, 10).map(row => {
        const val = row[column.name];
        return val === null || val === undefined ? 'NULL' : String(val);
      });
      const maxContentLength = Math.max(headerLength, ...sampleValues.map(v => v.length));
      return Math.min(Math.max(maxContentLength * 8 + 40, 100), 300);
    });
  }, [columns, rows]);

  // Sync filters with parent
  React.useEffect(() => {
    if (parentFilters) {
      setFilters(parentFilters);
    }
  }, [parentFilters]);

  const handleAddFilter = (filter: ColumnFilter) => {
    const newFilters = [...filters, filter];
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleRemoveFilter = (column: string) => {
    const newFilters = filters.filter((f) => f.column !== column);
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleClearAllFilters = () => {
    setFilters([]);
    onFilterChange?.([]);
  };

  const handleCellClick = (column: DataColumn, value: any) => {
    const stringValue = formatCellValue(value);
    if (selectedCell?.column === column.name && selectedCell?.value === stringValue) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ column: column.name, value: stringValue });
      handleAddFilter({
        column: column.name,
        operator: value === null ? 'is_null' : 'equals',
        value: value === null ? '' : stringValue
      });
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toLocaleString() : parseFloat(value.toFixed(4)).toString();
    }
    if (typeof value === 'object') return JSON.stringify(value);
    const str = String(value);
    return str.length > 100 ? str.substring(0, 97) + '...' : str;
  };

  const getCellAlignment = (type: string) => {
    if (['integer', 'float', 'number', 'decimal'].includes(type)) return 'text-right';
    if (type === 'boolean') return 'text-center';
    return 'text-left';
  };

  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + 60;

  return (
    <div className={cn("border border-border rounded-md flex flex-col h-full", className)}>
      <ActiveFilters 
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      <div className="flex-1 overflow-auto">
        <table className="border-collapse" style={{ minWidth: `${totalWidth}px` }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted border-b border-border">
              <th 
                className="sticky left-0 z-20 bg-muted px-2 py-2 text-xs font-medium text-muted-foreground border-r border-border text-center"
                style={{ width: '60px', minWidth: '60px' }}
              >
                #
              </th>
              {columns.map((column, idx) => (
                <th
                  key={column.name}
                  className="bg-muted px-3 py-2 text-xs font-medium text-muted-foreground border-r border-border text-left whitespace-nowrap"
                  style={{ width: `${columnWidths[idx]}px`, minWidth: `${columnWidths[idx]}px` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate" title={`${column.name} (${column.type})`}>
                      {column.name}
                    </span>
                    <ColumnFilterPopover 
                      column={column} 
                      dbId={dbId || ''}
                      schemaId={schemaId || ''}
                      tableId={tableId || ''}
                      currentFilters={filters}
                      onAddFilter={handleAddFilter}
                      onRemoveFilter={handleRemoveFilter}
                      onClearAllFilters={handleClearAllFilters}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => {
                const rowNum = (currentPage - 1) * pageSize + rowIndex + 1;
                return (
                  <tr 
                    key={rowIndex}
                    className={cn(
                      "border-b border-border hover:bg-muted/50 transition-colors",
                      rowIndex % 2 === 1 && "bg-muted/20"
                    )}
                  >
                    <td 
                      className="sticky left-0 z-10 bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground border-r border-border text-center font-mono"
                      style={{ width: '60px', minWidth: '60px' }}
                    >
                      {rowNum.toLocaleString()}
                    </td>
                    {columns.map((column, colIndex) => {
                      const value = row[column.name];
                      const displayValue = formatCellValue(value);
                      const isNull = value === null || value === undefined;
                      const isSelected = selectedCell?.column === column.name && selectedCell?.value === displayValue;

                      return (
                        <td
                          key={column.name}
                          className={cn(
                            "px-3 py-1.5 text-sm border-r border-border truncate cursor-pointer hover:bg-accent/30 transition-colors",
                            getCellAlignment(column.type),
                            isNull && "text-muted-foreground italic",
                            isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/30"
                          )}
                          style={{ 
                            width: `${columnWidths[colIndex]}px`, 
                            minWidth: `${columnWidths[colIndex]}px`,
                            maxWidth: `${columnWidths[colIndex]}px`
                          }}
                          onClick={() => handleCellClick(column, value)}
                          title={displayValue}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="py-20 text-center text-muted-foreground">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-lg font-medium mb-1">No data found</p>
                  <p className="text-sm">This table appears to be empty or no rows match your query.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border flex items-center justify-between flex-shrink-0">
        <span>
          {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''} × {columns.length} column{columns.length !== 1 ? 's' : ''}
          {totalRows && (
            <span className="ml-2 text-foreground font-medium">
              (Total: {totalRows.toLocaleString()} rows)
            </span>
          )}
        </span>
        {rows.length > 0 && (
          <span className="opacity-70">Scroll to see more →</span>
        )}
      </div>
    </div>
  );
}
