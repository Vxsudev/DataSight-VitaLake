"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ColumnFilterPopover, ActiveFilters, type ColumnFilter } from './smart-column-filter';
import { MousePointer2 } from 'lucide-react';
import { useColumnResize } from '@/hooks/use-column-resize';

interface DataColumn {
  name: string;
  type: string;
}

type ColumnWidthMode = 'auto' | 'uniform' | 'content-fit';

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
  widthMode?: ColumnWidthMode;
}

export function DataTable({ 
  columns, 
  rows, 
  className, 
  currentPage, 
  pageSize, 
  totalRows, 
  dbId, 
  schemaId, 
  tableId, 
  onFilterChange, 
  filters: parentFilters,
  widthMode = 'auto' 
}: DataTableProps) {
  const [filters, setFilters] = useState<ColumnFilter[]>(parentFilters || []);
  const [selectedCell, setSelectedCell] = useState<{column: string, value: string} | null>(null);

  // Initialize column widths based on mode
  const initialColumnWidths = useMemo(() => {
    const savedWidths = widthMode === 'auto' && dbId && schemaId && tableId ? 
      (() => {
        try {
          const saved = localStorage.getItem(`table-widths-${dbId}-${schemaId}-${tableId}`);
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })() : null;

    if (savedWidths && Object.keys(savedWidths).length === columns.length) {
      return columns.map((col, i) => savedWidths[col.name] || 120);
    }

    return columns.map((column) => {
      switch (widthMode) {
        case 'uniform':
          return Math.max(150, Math.min(250, Math.floor(800 / columns.length)));
        case 'content-fit':
          const headerLength = column.name.length;
          const sampleContent = rows.slice(0, 3).map(row => {
            const value = row[column.name];
            return value === null || value === undefined ? 'NULL' : String(value);
          });
          const maxContentLength = Math.max(headerLength, ...sampleContent.map(val => val.length));
          return Math.min(Math.max(maxContentLength * 8 + 60, 120), 350);
        default:
          const baseWidth = Math.max(column.name.length * 7, 80);
          const typeBonus = ['integer', 'float'].includes(column.type) ? 20 : 40;
          return Math.min(Math.max(baseWidth + typeBonus, 120), 280);
      }
    });
  }, [columns, widthMode, dbId, schemaId, tableId, rows]);

  const [columnWidths, setColumnWidths] = useState<number[]>(initialColumnWidths);

  const {
    headerRefs,
    rowRefs,
    bodyContainerRef,
    headerContainerRef,
    startResize,
    handleAutoResize,
    setupScrollSync,
  } = useColumnResize(columnWidths, (columnIndex, width) => {
    setColumnWidths(prev => {
      const newWidths = [...prev];
      newWidths[columnIndex] = width;
      
      // Save to localStorage for auto mode
      if (widthMode === 'auto' && dbId && schemaId && tableId) {
        const widthMap: Record<string, number> = {};
        columns.forEach((col, i) => {
          widthMap[col.name] = newWidths[i];
        });
        localStorage.setItem(`table-widths-${dbId}-${schemaId}-${tableId}`, JSON.stringify(widthMap));
      }
      
      return newWidths;
    });
  });

  // Setup scroll synchronization
  React.useEffect(() => {
    const cleanup = setupScrollSync();
    return cleanup;
  }, [setupScrollSync]);

  // Sync filters with parent
  React.useEffect(() => {
    if (parentFilters) {
      setFilters(parentFilters);
    }
  }, [parentFilters]);

  const handleAddFilter = useCallback((filter: ColumnFilter) => {
    const newFilters = [...filters, filter];
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [filters, onFilterChange]);

  const handleRemoveFilter = useCallback((index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  }, [filters, onFilterChange]);

  const handleClearAllFilters = useCallback(() => {
    setFilters([]);
    onFilterChange?.([]);
  }, [onFilterChange]);

  const setRowRef = (rowIndex: number, columnIndex: number, element: HTMLElement | null) => {
    if (!rowRefs.current[rowIndex]) {
      rowRefs.current[rowIndex] = [];
    }
    rowRefs.current[rowIndex][columnIndex] = element;
  };

  const setHeaderRef = (columnIndex: number, element: HTMLElement | null) => {
    headerRefs.current[columnIndex] = element;
  };

  const handleCellClick = (column: DataColumn, value: any) => {
    const stringValue = value === null || value === undefined ? '' : String(value);
    const displayValue = stringValue === '' ? 'NULL' : stringValue;
    
    const filter: ColumnFilter = {
      column: column.name,
      operator: stringValue === '' ? 'is_null' : 'equals',
      value: stringValue,
      displayValue
    };
    
    handleAddFilter(filter);
    setSelectedCell({ column: column.name, value: stringValue });
  };

  const getColumnWidth = (column: DataColumn, index: number) => {
    return columnWidths[index] || 120;
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      }
      return parseFloat(value.toFixed(4)).toString();
    }
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 97) + '...';
    }
    return String(value);
  };

  const getCellAlignment = (column: DataColumn) => {
    if (['integer', 'float'].includes(column.type)) {
      return 'text-right';
    }
    if (column.type === 'boolean') {
      return 'text-center';
    }
    return 'text-left';
  };

  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 60); // +60 for row number column

  return (
    <div className={cn("relative border border-border rounded-md w-full h-full flex flex-col", className)}>
      {/* Active Filters */}
      <ActiveFilters 
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* Table Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Header - Absolutely positioned */}
        <div 
          ref={headerContainerRef}
          className="absolute top-0 left-0 right-0 z-10 bg-background border-b border-border"
          style={{ 
            height: '40px',
            minWidth: Math.max(totalWidth, 800)
          }}
        >
          <div className="flex">
            {/* Row number header */}
            <div 
              className="flex-shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted border-r border-border"
              style={{ width: '60px', height: '40px' }}
            >
              #
            </div>
            
            {/* Column Headers */}
            {columns.map((column, index) => {
              const width = getColumnWidth(column, index);
              return (
                <div
                  key={column.name}
                  ref={(el) => setHeaderRef(index, el)}
                  className="flex-shrink-0 relative px-3 text-xs font-medium text-muted-foreground bg-background border-r border-border hover:bg-muted/60 transition-colors whitespace-nowrap group cursor-pointer"
                  style={{ 
                    width: `${width}px`,
                    minWidth: `${width}px`,
                    maxWidth: `${width}px`,
                    height: '40px'
                  }}
                  title={`${column.name} (${column.type})`}
                >
                  <div className="flex items-center gap-1 justify-between w-full h-full">
                    <span className="truncate flex-1">{column.name}</span>
                    <ColumnFilterPopover 
                      column={column} 
                      onFilterChange={handleAddFilter}
                      currentFilters={filters}
                    />
                  </div>

                  {/* Resize Handle */}
                  <div
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-primary/50 transition-colors group-hover:bg-border"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startResize(index, e.clientX);
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAutoResize(index);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Body - Scrollable container */}
        <div 
          ref={bodyContainerRef}
          className="absolute inset-0 overflow-auto"
          style={{ 
            paddingTop: '40px', // Space for header
            minWidth: Math.max(totalWidth, 800)
          }}
        >
          {rows.length > 0 ? (
            <div className="relative">
              {rows.map((row, index) => {
                const actualRowNumber = currentPage && pageSize 
                  ? (currentPage - 1) * pageSize + index + 1 
                  : index + 1;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex border-b border-border hover:bg-muted/50 transition-colors",
                      index % 2 === 0 ? "bg-background" : "bg-muted/20"
                    )}
                    style={{ height: '32px' }}
                  >
                    {/* Row Number Column */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-xs font-mono text-muted-foreground border-r border-border bg-muted/30"
                      style={{ width: '60px' }}
                    >
                      {actualRowNumber}
                    </div>

                    {/* Data Columns */}
                    {columns.map((column, columnIndex) => {
                      const value = row[column.name];
                      const formattedValue = formatCellValue(value);
                      const isSelected = selectedCell?.column === column.name && selectedCell?.value === formattedValue;
                      const width = getColumnWidth(column, columnIndex);
                      const alignment = getCellAlignment(column);

                      return (
                        <div
                          key={column.name}
                          ref={(el) => setRowRef(index, columnIndex, el)}
                          className={cn(
                            "flex-shrink-0 px-3 py-1 border-r border-border overflow-hidden text-ellipsis whitespace-nowrap text-sm cursor-pointer transition-colors relative",
                            alignment,
                            isSelected && "bg-primary/10 ring-1 ring-primary/20"
                          )}
                          style={{ width: `${width}px` }}
                          onClick={() => handleCellClick(column, value)}
                          title={formattedValue}
                        >
                          {formattedValue}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-lg font-medium mb-1">No data found</p>
                <p className="text-sm">This table appears to be empty or no rows match your query.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row count indicator */}
      <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border flex items-center justify-between flex-shrink-0">
        <span>
          {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''} × {columns.length} column{columns.length !== 1 ? 's' : ''} on this page
          {totalRows && (
            <span className="ml-2 text-foreground font-medium">
              (Total: {totalRows.toLocaleString()} rows)
            </span>
          )}
        </span>
        {rows.length > 0 && (
          <span className="text-xs opacity-70">
            Scroll to see more rows/columns →
          </span>
        )}
      </div>
    </div>
  );
}
