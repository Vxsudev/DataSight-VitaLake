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
  MoreHorizontal,
  SortAsc,
  SortDesc,
  Loader2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnFilter {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_null' | 'is_not_null';
  value: string;
  displayValue?: string;
}

interface DistinctValue {
  value: string | null;
  count: number;
  displayValue: string;
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
  uniqueValues, 
  currentFilters, 
  onAddFilter, 
  onRemoveFilter,
  onClearAllFilters,
  className 
}: ColumnFilterProps) {
  const [filterValue, setFilterValue] = useState('');
  const [operator, setOperator] = useState<ColumnFilter['operator']>('equals');
  const [searchValue, setSearchValue] = useState('');

  const hasFilter = currentFilters.some(f => f.column === column.name);
  const currentFilter = currentFilters.find(f => f.column === column.name);

  // Filter unique values based on search
  const filteredValues = uniqueValues.filter(value => 
    value.toLowerCase().includes(searchValue.toLowerCase())
  ).slice(0, 20); // Limit to 20 for performance

  const handleQuickFilter = (value: string) => {
    const displayValue = value === '' ? 'NULL' : value;
    const filterOperator = value === '' ? 'is_null' : 'equals';
    
    onAddFilter({
      column: column.name,
      operator: filterOperator,
      value: value,
      displayValue
    });
  };

  const handleCustomFilter = () => {
    if (!filterValue.trim() && operator !== 'is_null' && operator !== 'is_not_null') return;
    
    const displayValue = operator === 'is_null' || operator === 'is_not_null' 
      ? operator.replace('_', ' ').toUpperCase()
      : filterValue;

    onAddFilter({
      column: column.name,
      operator,
      value: filterValue,
      displayValue
    });
    setFilterValue('');
  };

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
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 w-6 p-0 hover:bg-accent/60",
            hasFilter && "bg-primary/20 text-primary hover:bg-primary/30",
            className
          )}
        >
          <Filter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter: {column.name}</h4>
            {currentFilters.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearAllFilters}
                className="text-xs h-6"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Current Filter Display */}
          {hasFilter && currentFilter && (
            <div className="p-2 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {operatorLabels[currentFilter.operator]}: {currentFilter.displayValue}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFilter(column.name)}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Quick Filters - Top Values */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">Quick Filter</h5>
            <div className="space-y-1">
              <Input
                placeholder="Search values..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="h-7 text-xs"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredValues.map((value, index) => {
                  const displayValue = value === '' ? 'NULL' : value;
                  const Icon = value === '' ? X : Check;
                  
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-6"
                      onClick={() => handleQuickFilter(value)}
                    >
                      <Icon className="h-3 w-3 mr-2" />
                      <span className="truncate">{displayValue}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Custom Filter */}
          <div className="space-y-2 border-t pt-2">
            <h5 className="text-xs font-medium text-muted-foreground">Custom Filter</h5>
            <div className="space-y-2">
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as ColumnFilter['operator'])}
                className="w-full h-7 text-xs border rounded px-2 bg-background"
              >
                {Object.entries(operatorLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              
              {operator !== 'is_null' && operator !== 'is_not_null' && (
                <Input
                  placeholder="Filter value..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomFilter()}
                  className="h-7 text-xs"
                />
              )}
              
              <Button 
                onClick={handleCustomFilter} 
                size="sm" 
                className="w-full h-7"
                disabled={!filterValue.trim() && operator !== 'is_null' && operator !== 'is_not_null'}
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Filter display component
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
