import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useColumnResize } from '@/hooks/use-column-resize';
import { ResizableHeaderCell } from '@/components/ui/resizable-header-cell';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  header: string;
  width: number;
}

interface RowData {
  [key: string]: any;
}

interface VirtualizedTableProps {
  columns: Column[];
  data: RowData[];
  height?: number;
  rowHeight?: number;
  className?: string;
  onColumnResize?: (columnIndex: number, width: number) => void;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    rows: RowData[];
    columns: Column[];
    setRowRef: (rowIndex: number, columnIndex: number, element: HTMLElement | null) => void;
    columnWidths: number[];
  };
}

const Row = React.memo(({ index, style, data }: RowProps) => {
  const { rows, columns, setRowRef, columnWidths } = data;
  const row = rows[index];

  return (
    <div
      style={style}
      className="flex border-b border-border hover:bg-muted/50 transition-colors"
    >
      {columns.map((column, colIndex) => (
        <div
          key={column.key}
          ref={(el) => setRowRef(index, colIndex, el)}
          className="flex-none px-3 py-2 text-sm border-r border-border last:border-r-0 overflow-hidden"
          style={{
            width: `${columnWidths[colIndex]}px`,
            minWidth: `${columnWidths[colIndex]}px`,
            maxWidth: `${columnWidths[colIndex]}px`,
          }}
        >
          <div className="truncate">{row[column.key]}</div>
        </div>
      ))}
    </div>
  );
});

Row.displayName = 'Row';

export function VirtualizedTable({
  columns,
  data,
  height = 400,
  rowHeight = 40,
  className,
  onColumnResize,
}: VirtualizedTableProps) {
  const initialWidths = useMemo(() => columns.map(col => col.width), [columns]);
  const [columnWidths, setColumnWidths] = React.useState(initialWidths);

  const {
    headerRefs,
    rowRefs,
    startResize,
    handleAutoResize,
  } = useColumnResize(columnWidths, (columnIndex, width) => {
    setColumnWidths(prev => {
      const newWidths = [...prev];
      newWidths[columnIndex] = width;
      return newWidths;
    });
    onColumnResize?.(columnIndex, width);
  });

  const setHeaderRef = (index: number, element: HTMLElement | null) => {
    headerRefs.current[index] = element;
  };

  const setRowRef = (rowIndex: number, columnIndex: number, element: HTMLElement | null) => {
    if (!rowRefs.current[rowIndex]) {
      rowRefs.current[rowIndex] = [];
    }
    rowRefs.current[rowIndex][columnIndex] = element;
  };

  const itemData = useMemo(() => ({
    rows: data,
    columns,
    setRowRef,
    columnWidths,
  }), [data, columns, columnWidths]);

  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  return (
    <div className={cn('border border-border rounded-md overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <ResizableHeaderCell
                  key={column.key}
                  columnIndex={index}
                  width={columnWidths[index]}
                  onResizeStart={startResize}
                  onAutoResize={handleAutoResize}
                  setHeaderRef={setHeaderRef}
                >
                  {column.header}
                </ResizableHeaderCell>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtualized Body */}
      <div style={{ height }}>
        <List
          height={height}
          itemCount={data.length}
          itemSize={rowHeight}
          itemData={itemData}
          width={Math.max(totalWidth, 800)}
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
