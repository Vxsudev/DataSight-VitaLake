"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Filter,
  X,
  Search,
  Check,
  Equal,
  Minus,
  Loader2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchDistinctValues, type DistinctValue } from '@/lib/universal-data';

export interface ColumnFilter {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_null' | 'is_not_null';
  value: string;
  displayValue?: string;
}

interface ColumnFilterProps {
  column: {
    name: string;
    type: string;
  };
  dbId: string;
  schemaId: string;
  tableId: string;
  currentFilters: ColumnFilter[];
  onAddFilter: (filter: ColumnFilter) => void;
  onRemoveFilter: (column: string) => void;
  onClearAllFilters: () => void;
  className?: string;
}

export function ColumnFilterPopover({ 
  column, 
  dbId,
  schemaId,
  tableId,
  currentFilters, 
  onAddFilter, 
  onRemoveFilter,
  onClearAllFilters,
  className
}: ColumnFilterProps) {
  const [filterValue, setFilterValue] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<ColumnFilter['operator']>('equals');
  const [distinctValues, setDistinctValues] = useState<DistinctValue[]>([]);
  const [loadingDistinct, setLoadingDistinct] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Check if this column has any active filters
  const hasFilter = currentFilters.some(f => f.column === column.name);

  // Fetch distinct values when popover opens using universal data service
  const fetchDistinctValuesForColumn = async (searchTerm?: string) => {
    setLoadingDistinct(true);
    try {
      const result = await fetchDistinctValues({
        dbId,
        schemaId,
        tableId,
        columnName: column.name
      }, {
        limit: 100,
        searchTerm: searchTerm || undefined
      });
      
      setDistinctValues(result.values);
    } catch (error) {
      console.error('Failed to fetch distinct values:', error);
      // Set empty array on error to prevent infinite loading
      setDistinctValues([]);
    } finally {
      setLoadingDistinct(false);
    }
  };

  // Handle search changes with debouncing
  useEffect(() => {
    if (!searchValue) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      fetchDistinctValuesForColumn(searchValue);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  // Clear search and reload all values
  const handleClearSearch = () => {
    setSearchValue('');
    setDistinctValues([]); // Clear current values to force reload
    fetchDistinctValuesForColumn(); // Reload without search term
  };

  // Handle quick filter selection
  const handleQuickFilter = (distinctValue: DistinctValue) => {
    const operator = distinctValue.value === null ? 'is_null' : 'equals';
    const value = distinctValue.value || '';
    
    onAddFilter({
      column: column.name,
      operator,
      value,
      displayValue: distinctValue.displayValue
    });
  };

  // Handle advanced filter
  const handleAdvancedFilter = () => {
    if (!filterValue && selectedOperator !== 'is_null' && selectedOperator !== 'is_not_null') return;

    const displayValue = selectedOperator === 'is_null' ? 'NULL' : 
                        selectedOperator === 'is_not_null' ? 'NOT NULL' : 
                        filterValue;

    onAddFilter({
      column: column.name,
      operator: selectedOperator,
      value: filterValue,
      displayValue
    });
    setFilterValue('');
  };

  // Filter distinct values based on search (this is for client-side filtering of already loaded values)
  // The main search is now handled server-side via the API
  const filteredDistinctValues = distinctValues.slice(0, 20); // Just limit display

  const operatorLabels = {
    equals: 'Equals',
    not_equals: 'Not Equals',
    contains: 'Contains',
    not_contains: 'Does Not Contain',
    is_null: 'Is NULL',
    is_not_null: 'Is Not NULL'
  };

  const operatorIcons = {
    equals: Equal,
    not_equals: Minus,
    contains: Search,
    not_contains: Search,
    is_null: X,
    is_not_null: Check
  };

  return (
    <Popover onOpenChange={(open) => {
      if (open && distinctValues.length === 0) {
        fetchDistinctValuesForColumn();
      }
    }}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-5 w-5 p-0 hover:bg-accent/60 rounded-sm",
            hasFilter && "bg-primary/20 text-primary hover:bg-primary/30",
            className
          )}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Filter: {column.name}</h4>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFilter(column.name)}
                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Quick Filters Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quick Filters</span>
              {loadingDistinct && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>

            {distinctValues.length > 0 && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search values..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                  {searchValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredDistinctValues.map((distinctValue, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickFilter(distinctValue)}
                      className="w-full justify-between text-xs h-7 px-2"
                    >
                      <span className="truncate">{distinctValue.displayValue}</span>
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        {distinctValue.count.toLocaleString()}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {loadingDistinct && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading values...</span>
              </div>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <div className="border-t pt-3 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs w-full justify-start"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            </Button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(operatorLabels).map(([op, label]) => {
                    const Icon = operatorIcons[op as keyof typeof operatorIcons];
                    return (
                      <Button
                        key={op}
                        size="sm"
                        variant={selectedOperator === op ? 'default' : 'outline'}
                        onClick={() => setSelectedOperator(op as ColumnFilter['operator'])}
                        className="justify-start gap-1 text-xs h-7"
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </Button>
                    );
                  })}
                </div>

                {selectedOperator !== 'is_null' && selectedOperator !== 'is_not_null' && (
                  <Input
                    placeholder="Enter value..."
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="text-xs h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdvancedFilter()}
                  />
                )}

                <Button
                  onClick={handleAdvancedFilter}
                  disabled={!filterValue && selectedOperator !== 'is_null' && selectedOperator !== 'is_not_null'}
                  className="w-full h-7 text-xs"
                  size="sm"
                >
                  Apply Filter
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simple filter button for direct cell click filtering
export function QuickFilterButton({ 
  column, 
  value, 
  onAddFilter,
  className 
}: {
  column: { name: string; type: string };
  value: any;
  onAddFilter: (filter: ColumnFilter) => void;
  className?: string;
}) {
  const handleClick = () => {
    const isNull = value === null || value === undefined || value === '';
    const operator = isNull ? 'is_null' : 'equals';
    const filterValue = isNull ? '' : String(value);
    const displayValue = isNull ? 'NULL' : String(value);

    onAddFilter({
      column: column.name,
      operator,
      value: filterValue,
      displayValue
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/20",
        className
      )}
    >
      <Filter className="h-2 w-2" />
    </Button>
  );
}

// Component to display active filters
interface ActiveFiltersProps {
  filters: ColumnFilter[];
  onRemoveFilter: (column: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
      <span className="text-xs text-muted-foreground">Filters:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {filters.map((filter, index) => (
          <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
            <span>{filter.column}: {filter.displayValue}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveFilter(filter.column)}
              className="h-3 w-3 p-0 hover:bg-destructive/20"
            >
              <X className="h-2 w-2" />
            </Button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs h-6"
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}
