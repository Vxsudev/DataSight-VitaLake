import { useRef, useCallback, useEffect } from 'react';

export interface ColumnResizeState {
  isResizing: boolean;
  columnIndex: number | null;
  startX: number;
  startWidth: number;
}

export interface UseColumnResizeReturn {
  resizeState: React.MutableRefObject<ColumnResizeState>;
  headerRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  rowRefs: React.MutableRefObject<(HTMLElement | null)[][]>;
  bodyContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  headerContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  tableContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  widthsRef: React.MutableRefObject<number[]>;
  startResize: (columnIndex: number, startX: number) => void;
  handleAutoResize: (columnIndex: number) => void;
  commitWidth: (columnIndex: number, width: number) => void;
  setupScrollSync: () => void;
  getColumnWidth: (columnIndex: number) => number;
  reapplyAllWidths: () => void;
}

export function useColumnResize(
  initialWidths: number[],
  onWidthChange?: (columnIndex: number, width: number) => void
): UseColumnResizeReturn {
  const resizeState = useRef<ColumnResizeState>({
    isResizing: false,
    columnIndex: null,
    startX: 0,
    startWidth: 0,
  });

  const headerRefs = useRef<(HTMLElement | null)[]>([]);
  const rowRefs = useRef<(HTMLElement | null)[][]>([]);
  const bodyContainerRef = useRef<HTMLDivElement | null>(null);
  const headerContainerRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const widthsRef = useRef<number[]>(initialWidths);

  // Direct DOM width update - applies to both header and body cells
  const updateColumnWidth = useCallback((columnIndex: number, width: number) => {
    const widthPx = `${width}px`;
    
    // Update header cell
    const header = headerRefs.current[columnIndex];
    if (header) {
      header.style.width = widthPx;
      header.style.minWidth = widthPx;
      header.style.maxWidth = widthPx;
    }

    // Update all body cells for this column
    const rows = rowRefs.current;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i]?.[columnIndex];
      if (cell) {
        cell.style.width = widthPx;
        cell.style.minWidth = widthPx;
        cell.style.maxWidth = widthPx;
      }
    }

    widthsRef.current[columnIndex] = width;
  }, []);

  // Setup synchronized horizontal scrolling
  const setupScrollSync = useCallback(() => {
    const bodyContainer = bodyContainerRef.current;
    const headerContainer = headerContainerRef.current;
    
    if (!bodyContainer || !headerContainer) return;

    const handleScroll = () => {
      const scrollLeft = bodyContainer.scrollLeft;
      // Sync header position using transform - no rerender
      requestAnimationFrame(() => {
        headerContainer.style.transform = `translateX(${-scrollLeft}px)`;
      });
    };

    bodyContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial sync
    handleScroll();
    
    return () => {
      bodyContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const startResize = useCallback((columnIndex: number, startX: number) => {
    const header = headerRefs.current[columnIndex];
    if (!header) return;

    const startWidth = widthsRef.current[columnIndex] || header.offsetWidth;
    
    resizeState.current = {
      isResizing: true,
      columnIndex,
      startX,
      startWidth,
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!resizeState.current.isResizing) return;
      
      const deltaX = e.clientX - resizeState.current.startX;
      const newWidth = Math.max(50, resizeState.current.startWidth + deltaX);
      
      // Instant DOM update
      updateColumnWidth(columnIndex, newWidth);
    };

    const handlePointerUp = () => {
      if (!resizeState.current.isResizing) return;
      
      const finalWidth = widthsRef.current[columnIndex];
      resizeState.current.isResizing = false;
      
      // Commit to parent state (optional)
      onWidthChange?.(columnIndex, finalWidth);
      
      // Cleanup
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };

    // Use pointer events for better performance
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  }, [updateColumnWidth, onWidthChange]);

  const handleAutoResize = useCallback((columnIndex: number) => {
    requestAnimationFrame(() => {
      let maxWidth = 0;
      
      // Measure header
      const header = headerRefs.current[columnIndex];
      if (header) {
        maxWidth = Math.max(maxWidth, header.scrollWidth + 16);
      }

      // Measure all cells in column
      const rows = rowRefs.current;
      for (let i = 0; i < rows.length; i++) {
        const cell = rows[i]?.[columnIndex];
        if (cell) {
          maxWidth = Math.max(maxWidth, cell.scrollWidth + 16);
        }
      }

      // Apply constraints
      const optimalWidth = Math.min(Math.max(maxWidth, 60), 600);
      
      // Instant update
      updateColumnWidth(columnIndex, optimalWidth);
      
      // Commit
      onWidthChange?.(columnIndex, optimalWidth);
    });
  }, [updateColumnWidth, onWidthChange]);

  const commitWidth = useCallback((columnIndex: number, width: number) => {
    updateColumnWidth(columnIndex, width);
    onWidthChange?.(columnIndex, width);
  }, [updateColumnWidth, onWidthChange]);

  const getColumnWidth = useCallback((columnIndex: number) => {
    return widthsRef.current[columnIndex] || 120;
  }, []);

  // Reapply all widths to both header and body (useful after layout changes)
  const reapplyAllWidths = useCallback(() => {
    const columnCount = widthsRef.current.length;
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Reset header transform in case it's stuck
      const headerContainer = headerContainerRef.current;
      const bodyContainer = bodyContainerRef.current;
      
      if (headerContainer && bodyContainer) {
        // Reset transform and sync with current body scroll position
        const scrollLeft = bodyContainer.scrollLeft;
        headerContainer.style.transform = `translateX(${-scrollLeft}px)`;
      }
      
      // Reapply all column widths
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        const width = widthsRef.current[columnIndex];
        if (width) {
          updateColumnWidth(columnIndex, width);
        }
      }
    });
  }, [updateColumnWidth]);

  // Setup ResizeObserver to reapply widths when container size changes
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver((entries) => {
      // Immediate reapplication for faster response
      reapplyAllWidths();
      
      // Also debounced version for any subsequent changes
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        reapplyAllWidths();
      }, 50);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [reapplyAllWidths]);

  return {
    resizeState,
    headerRefs,
    rowRefs,
    bodyContainerRef,
    headerContainerRef,
    tableContainerRef,
    widthsRef,
    startResize,
    handleAutoResize,
    commitWidth,
    setupScrollSync,
    getColumnWidth,
    reapplyAllWidths,
  };
}
