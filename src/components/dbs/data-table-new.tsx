"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
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

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    rows: Record<string, any>[];
    columns: DataColumn[];
    columnWidths: number[];
    setRowRef: (rowIndex: number, columnIndex: number, element: HTMLElement | null) => void;
    onCellClick: (column: DataColumn, value: any) => void;
    selectedCell: {column: string, value: string} | null;
    formatCellValue: (value: any) => string;
    getCellAlignment: (column: DataColumn) => string;
    getColumnWidth: (column: DataColumn, index: number) => number;
    currentPage?: number;
    pageSize?: number;
  };
}

const VirtualRow = React.memo(({ index, style, data }: RowProps) => {
  const { 
    rows, 
    columns, 
    columnWidths, 
    setRowRef, 
    onCellClick, 
    selectedCell, 
    formatCellValue, 
    getCellAlignment, 
    getColumnWidth,
    currentPage = 1,
    pageSize = 500
  } = data;
  
  const row = rows[index];
  const actualRowNumber = currentPage && pageSize 
    ? (currentPage - 1) * pageSize + index + 1 
    : index + 1;

  return (
    <div 
      style={style}
      className="flex border-b border-border hover:bg-muted/30 transition-colors group"
    >
      {/* Row number */}
      <div className="flex-none w-12 px-2 py-2 text-xs text-muted-foreground bg-muted border-r border-border sticky left-0 z-10 group-hover:bg-muted/80 transition-colors">
        {actualRowNumber.toLocaleString()}
      </div>
      
      {columns.map((column, colIndex) => {
        const cellValue = formatCellValue(row[column.name]);
        const rawValue = row[column.name];
        const isEmpty = !cellValue;
        const isSelected = selectedCell?.column === column.name && 
          String(selectedCell?.value) === String(rawValue === null || rawValue === undefined ? '' : rawValue);

        return (
          <div
            key={column.name}
            ref={(el) => setRowRef(index, colIndex, el)}
            className={cn(
              "flex-none px-3 py-2 text-xs border-r border-border last:border-r-0 truncate whitespace-nowrap cursor-pointer hover:bg-accent/20 transition-colors",
              getCellAlignment(column),
              isEmpty && "text-muted-foreground italic",
              isSelected && "bg-primary/20 ring-1 ring-primary/50"
            )}
            style={{
              width: `${getColumnWidth(column, colIndex)}px`,
              minWidth: `${getColumnWidth(column, colIndex)}px`,
              maxWidth: `${getColumnWidth(column, colIndex)}px`,
            }}
            onClick={() => onCellClick(column, rawValue)}
            title={`Click to filter by: ${cellValue || 'NULL'}`}
          >
            <div className="flex items-center gap-1">
              <span className="truncate flex-1">
                {isEmpty ? 'NULL' : cellValue}
              </span>
              <MousePointer2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </div>
          </div>
        );
      })}
    </div>
  );
});

VirtualRow.displayName = 'VirtualRow';

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
    startResize,
    handleAutoResize,
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

  // Sync filters with parent
  React.useEffect(() => {
    if (parentFilters) {
      setFilters(parentFilters);
    }
  }, [parentFilters]);

  const setHeaderRef = (index: number, element: HTMLElement | null) => {
    headerRefs.current[index] = element;
  };

  const setRowRef = (rowIndex: number, columnIndex: number, element: HTMLElement | null) => {
    if (!rowRefs.current[rowIndex]) {
      rowRefs.current[rowIndex] = [];
    }
    rowRefs.current[rowIndex][columnIndex] = element;
  };

  const handleAddFilter = (filter: ColumnFilter) => {
    const newFilters = filters.filter(f => f.column !== filter.column);
    newFilters.push(filter);
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleRemoveFilter = (columnName: string) => {
    const newFilters = filters.filter(f => f.column !== columnName);
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleClearAllFilters = () => {
    setFilters([]);
    onFilterChange?.([]);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'integer':
      case 'float':
        return '123';
      case 'boolean':
        return 'T/F';
      case 'timestamp':
      case 'date':
      case 'timestamptz':
        return '📅';
      default:
        return 'Aa';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'integer':
      case 'float':
        return 'text-blue-600 dark:text-blue-400';
      case 'boolean':
        return 'text-green-600 dark:text-green-400';
      case 'timestamp':
      case 'date':
      case 'timestamptz':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
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

  const rowData = useMemo(() => ({
    rows,
    columns,
    columnWidths,
    setRowRef,
    onCellClick: handleCellClick,
    selectedCell,
    formatCellValue,
    getCellAlignment,
    getColumnWidth,
    currentPage,
    pageSize,
  }), [rows, columns, columnWidths, selectedCell, currentPage, pageSize]);

  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 48); // +48 for row number column

  return (
    <div className={cn("relative border border-border rounded-md w-full h-full flex flex-col", className)}>
      {/* Active Filters */}
      <ActiveFilters 
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* Header */}
      <div className="flex-shrink-0 overflow-x-auto">
        <div style={{ minWidth: Math.max(totalWidth, 800) }}>
          <table className="w-full border-collapse bg-background">
            <thead className="sticky top-0 z-10 bg-background border-b border-border">
              <tr>
                {/* Row number header */}
                <th 
                  className="w-12 h-9 px-2 text-xs font-medium text-muted-foreground bg-muted border-r border-border sticky left-0 z-20"
                  style={{ minWidth: '48px', maxWidth: '48px' }}
                >
                  #
                </th>
                {columns.map((column, index) => (
                  <th
                    key={column.name}
                    ref={(el) => setHeaderRef(index, el)}
                    className="relative h-9 px-3 text-xs font-medium text-muted-foreground bg-background border-r border-border last:border-r-0 truncate hover:bg-muted/60 transition-colors whitespace-nowrap group"
                    style={{ 
                      width: `${getColumnWidth(column, index)}px`,
                      minWidth: `${getColumnWidth(column, index)}px`,
                      maxWidth: `${getColumnWidth(column, index)}px`
                    }}
                    title={`${column.name} (${column.type})`}
                  >
                    <div className="flex items-center gap-1 justify-between w-full">
                      <span className="truncate font-medium">{column.name}</span>
                      <div className="flex items-center gap-1">
                        <span className={cn("text-xs opacity-70 font-mono", getTypeColor(column.type))}>
                          {getTypeIcon(column.type)}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <ColumnFilterPopover
                            column={column}
                            dbId={dbId || 'primary'}
                            schemaId={schemaId || ''}
                            tableId={tableId || ''}
                            currentFilters={filters}
                            onAddFilter={handleAddFilter}
                            onRemoveFilter={handleRemoveFilter}
                            onClearAllFilters={handleClearAllFilters}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Resize handle - only for auto mode */}
                    {widthMode === 'auto' && (
                      <div
                        className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-primary/30 transition-all duration-200 group-hover:bg-border/30 border-l border-transparent hover:border-primary/50"
                        style={{ touchAction: 'none' }}
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
                        title="Drag to resize | Double-click to auto-fit"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-0.5 h-4 bg-muted-foreground/20 group-hover:bg-muted-foreground/50 hover:bg-primary/70 transition-colors rounded-full" />
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      </div>

      {/* Virtualized Body */}
      <div className="flex-1 overflow-hidden">
        {rows.length > 0 ? (
          <List
            height={400}
            itemCount={rows.length}
            itemSize={32}
            itemData={rowData}
            width={Math.max(totalWidth, 800)}
          >
            {VirtualRow}
          </List>
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
