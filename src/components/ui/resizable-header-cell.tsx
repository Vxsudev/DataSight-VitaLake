import React from 'react';
import { cn } from '@/lib/utils';

interface ResizableHeaderCellProps {
  children: React.ReactNode;
  columnIndex: number;
  width: number;
  className?: string;
  onResizeStart: (columnIndex: number, startX: number) => void;
  onAutoResize: (columnIndex: number) => void;
  setHeaderRef: (index: number, element: HTMLElement | null) => void;
}

export function ResizableHeaderCell({
  children,
  columnIndex,
  width,
  className,
  onResizeStart,
  onAutoResize,
  setHeaderRef,
}: ResizableHeaderCellProps) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onResizeStart(columnIndex, e.clientX);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAutoResize(columnIndex);
  };

  return (
    <th
      ref={(el) => setHeaderRef(columnIndex, el)}
      className={cn(
        'relative h-10 px-3 text-left text-xs font-medium text-muted-foreground bg-muted/50 border-r border-border select-none',
        className
      )}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
      }}
    >
      <div className="flex items-center justify-between h-full">
        <span className="truncate">{children}</span>
      </div>
      
      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-2 h-full cursor-col-resize bg-transparent hover:bg-primary/20 transition-colors group"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: 'none' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-0.5 h-4 bg-border group-hover:bg-primary transition-colors" />
        </div>
      </div>
    </th>
  );
}
