'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { ChartCard } from '@/components/dashboards/chart-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChartDefinition, ChartType, QueryResult } from '@/lib/types';
import Link from 'next/link';

// Mock data that would come from SQL Studio
const mockData = [
  { date: '2023-01-01', users: 10, revenue: 100 },
  { date: '2023-01-02', users: 15, revenue: 150 },
  { date: '2023-01-03', users: 12, revenue: 120 },
  { date: '2023-01-04', users: 20, revenue: 220 },
  { date: '2023-01-05', users: 25, revenue: 280 },
  { date: '2023-01-06', users: 22, revenue: 250 },
];
const mockColumns = Object.keys(mockData[0]);

export default function ChartBuilderPage() {
  const searchParams = useSearchParams();
  const [chartData, setChartData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [chartName, setChartName] = useState('New Chart');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string[]>([]);
  const [autoDetectionMessage, setAutoDetectionMessage] = useState<string>('');
  const [hasNumericData, setHasNumericData] = useState(true);

  // Intelligent axis detection based on data types
  const detectAxes = useCallback((columns: any[], rows: any[]) => {
    if (!columns.length || !rows.length) {
      setHasNumericData(false);
      return { xAxis: '', yAxis: [] };
    }
    
    const categoricalTypes = ['varchar', 'text', 'string', 'date', 'timestamp', 'timestamptz', 'char'];
    const numericTypes = ['integer', 'float', 'decimal', 'bigint', 'real', 'double', 'numeric', 'int', 'smallint'];
    
    // Enhanced type detection with actual data sampling
    const analyzeColumn = (col: any) => {
      console.log('Analyzing column:', { name: col.name, type: col.type });
      
      // First, analyze actual data values (prioritize content over DB type)
      const sampleValues = rows.slice(0, 10).map(row => row[col.name]);
      const validValues = sampleValues.filter(val => val !== null && val !== undefined && val !== '');
      
      console.log(`Column ${col.name}: Sample values:`, sampleValues);
      console.log(`Column ${col.name}: Valid values:`, validValues);
      
      if (validValues.length === 0) {
        console.log(`Column ${col.name}: No valid values found`);
        return { type: 'unknown', confidence: 'low', reason: 'No valid values found' };
      }
      
      // Check if all values are numeric
      const numericCount = validValues.filter(val => {
        if (typeof val === 'number') return true;
        if (typeof val === 'string') {
          const parsed = Number(val);
          const isNumeric = !isNaN(parsed) && isFinite(parsed);
          console.log(`Testing ${val} -> ${parsed}, isNumeric: ${isNumeric}`);
          return isNumeric;
        }
        return false;
      }).length;
      
      // Check if values look like dates
      const dateCount = validValues.filter(val => {
        if (val instanceof Date) return true;
        if (typeof val === 'string') {
          const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}|^\w{3}\s+\d{1,2},?\s+\d{4}/;
          return datePattern.test(val) || !isNaN(Date.parse(val));
        }
        return false;
      }).length;
      
      const numericRatio = numericCount / validValues.length;
      const dateRatio = dateCount / validValues.length;
      
      console.log(`Column ${col.name}: numericCount=${numericCount}, dateCount=${dateCount}, validValues=${validValues.length}`);
      console.log(`Column ${col.name}: numericRatio=${numericRatio}, dateRatio=${dateRatio}`);
      
      // Data content analysis takes priority
      if (numericRatio >= 0.6) { // Lowered from 0.8 to 0.6
        const result = { type: 'numeric', confidence: numericRatio >= 0.9 ? 'high' : 'medium', reason: `${Math.round(numericRatio * 100)}% numeric values (data analysis)` };
        console.log(`Column ${col.name}: Detected as numeric by content -`, result);
        return result;
      } else if (dateRatio >= 0.6) { // Lowered from 0.8 to 0.6
        const result = { type: 'date', confidence: dateRatio >= 0.9 ? 'high' : 'medium', reason: `${Math.round(dateRatio * 100)}% date-like values (data analysis)` };
        console.log(`Column ${col.name}: Detected as date by content -`, result);
        return result;
      } else if (numericCount > 0) {
        // If we have ANY numeric values, still consider it numeric with low confidence
        const result = { type: 'numeric', confidence: 'low', reason: `${numericCount} numeric values found (${Math.round(numericRatio * 100)}%) (data analysis)` };
        console.log(`Column ${col.name}: Detected as numeric (low confidence) by content -`, result);
        return result;
      }
      
      // Fall back to database type analysis if data content is inconclusive
      const dbType = col.type?.toLowerCase() || '';
      
      if (categoricalTypes.some(type => dbType.includes(type))) {
        console.log(`Column ${col.name}: Categorical by DB type (${col.type})`);
        return { type: 'categorical', confidence: 'medium', reason: `Database type: ${col.type}` };
      }
      
      if (numericTypes.some(type => dbType.includes(type))) {
        console.log(`Column ${col.name}: Numeric by DB type (${col.type})`);
        return { type: 'numeric', confidence: 'high', reason: `Database type: ${col.type}` };
      }
      
      // Final fallback
      const result = { type: 'categorical', confidence: 'low', reason: 'Mixed or text values' };
      console.log(`Column ${col.name}: Fallback to categorical -`, result);
      return result;
    };
    
    // Analyze all columns
    const columnAnalysis = columns.map(col => ({
      ...col,
      analysis: analyzeColumn(col)
    }));
    
    console.log('Enhanced column analysis:', columnAnalysis);
    
    // Find best X-axis (prefer dates, then categorical, then first column)
    const dateColumns = columnAnalysis.filter(col => col.analysis.type === 'date');
    const categoricalColumns = columnAnalysis.filter(col => col.analysis.type === 'categorical');
    const numericColumns = columnAnalysis.filter(col => col.analysis.type === 'numeric');
    
    let selectedXAxis = '';
    let xAxisReason = '';
    
    if (dateColumns.length > 0) {
      selectedXAxis = dateColumns[0].name;
      xAxisReason = 'Auto-selected date column for X-axis';
    } else if (categoricalColumns.length > 0) {
      selectedXAxis = categoricalColumns[0].name;
      xAxisReason = 'Auto-selected categorical column for X-axis';
    } else if (columnAnalysis.length > 0) {
      selectedXAxis = columnAnalysis[0].name;
      xAxisReason = 'Using first column as X-axis (no categorical data found)';
    }
    
    // Find all numeric columns for Y-axis (be more inclusive)
    const allPossibleNumeric = columnAnalysis.filter(col => 
      col.analysis.type === 'numeric' || 
      (col.analysis.type === 'categorical' && col.analysis.reason.includes('numeric'))
    );
    
    const selectedYAxis = allPossibleNumeric.length > 0 
      ? allPossibleNumeric.slice(0, 4).map(col => col.name)
      : []; // Fallback: if no numeric detected, try to use any non-X-axis column
    
    // If still no Y-axis columns, try a fallback approach
    if (selectedYAxis.length === 0 && columnAnalysis.length > 1) {
      // Find columns that might be numeric even if not detected as such
      const fallbackNumeric = columnAnalysis.filter(col => {
        if (col.name === selectedXAxis) return false; // Don't use X-axis column
        // Check if column name suggests it might be numeric
        const numericNames = ['count', 'sum', 'total', 'amount', 'value', 'price', 'cost', 'revenue', 'profit', 'score', 'rating', 'number', 'qty', 'quantity', 'age', 'year', 'month', 'day', 'hour', 'minute', 'second'];
        return numericNames.some(name => col.name.toLowerCase().includes(name));
      });
      
      if (fallbackNumeric.length > 0) {
        selectedYAxis.push(...fallbackNumeric.slice(0, 2).map(col => col.name));
      }
    }
    
    const yAxisReason = selectedYAxis.length > 0 
      ? `Auto-selected ${selectedYAxis.length} column(s) for Y-axis: ${selectedYAxis.join(', ')}`
      : 'No suitable numeric columns found for Y-axis';
    
    // Set detection message and numeric data flag
    setHasNumericData(numericColumns.length > 0);
    const message = `${xAxisReason}. ${yAxisReason}.`;
    setAutoDetectionMessage(message);
    
    console.log('Auto-detection results:', {
      xAxis: selectedXAxis,
      yAxis: selectedYAxis,
      message,
      columnAnalysis: columnAnalysis.map(col => ({
        name: col.name,
        type: col.analysis.type,
        confidence: col.analysis.confidence,
        reason: col.analysis.reason
      }))
    });
    
    return { xAxis: selectedXAxis, yAxis: selectedYAxis };
  }, []);

  // Load data from URL parameters (from SQL Studio)
  useEffect(() => {
    const dataParam = searchParams.get('data');
    const chartDataId = searchParams.get('chartDataId');
    
    console.log('Chart Builder Debug:', { 
      dataParam: dataParam ? `${dataParam.substring(0, 100)}...` : null,
      chartDataId,
      searchParams: Array.from(searchParams.entries())
    });

    // Try loading from sessionStorage first (for large datasets)
    if (chartDataId) {
      console.log(`Trying to load from sessionStorage with key: ${chartDataId}`);
      try {
        const storedData = sessionStorage.getItem(chartDataId);
        console.log('SessionStorage data:', storedData ? `Found ${storedData.length} chars` : 'Not found');
        
        if (storedData) {
          const queryResult: QueryResult = JSON.parse(storedData);
          console.log('Parsed sessionStorage data:', { 
            columnsCount: queryResult.columns?.length,
            rowsCount: queryResult.rows?.length,
            columns: queryResult.columns?.map(c => c.name)
          });
          
          if (queryResult && queryResult.rows && queryResult.columns) {
            setChartData(queryResult.rows);
            const columnNames = queryResult.columns.map(col => col.name);
            setColumns(columnNames);
            
            // Auto-detect best axes
            const { xAxis: autoXAxis, yAxis: autoYAxis } = detectAxes(queryResult.columns, queryResult.rows);
            setXAxis(autoXAxis);
            setYAxis(autoYAxis);
            
            console.log('Successfully loaded data from sessionStorage with auto-detection!');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load data from sessionStorage:', error);
      }
    }

    // Try loading from URL parameter (for smaller datasets)
    if (dataParam) {
      console.log('Trying to load from URL parameter');
      try {
        let decodedData;
        try {
          decodedData = atob(decodeURIComponent(dataParam));
          console.log('Successfully decoded base64 data');
        } catch (base64Error) {
          console.log('Base64 decode failed, trying direct URI decode');
          try {
            decodedData = decodeURIComponent(dataParam);
            console.log('Successfully decoded URI data');
          } catch (decodeError) {
            console.warn('URI decode failed, using raw data:', decodeError);
            decodedData = dataParam;
          }
        }
        
        console.log('Parsed data preview:', decodedData.substring(0, 200));
        const queryResult: QueryResult = JSON.parse(decodedData);
        console.log('Parsed queryResult:', { 
          columnsCount: queryResult.columns?.length,
          rowsCount: queryResult.rows?.length,
          columns: queryResult.columns?.map(c => c.name)
        });
        
        if (queryResult && queryResult.rows && queryResult.columns) {
          setChartData(queryResult.rows);
          const columnNames = queryResult.columns.map(col => col.name);
          setColumns(columnNames);
          
          // Auto-detect best axes
          const { xAxis: autoXAxis, yAxis: autoYAxis } = detectAxes(queryResult.columns, queryResult.rows);
          setXAxis(autoXAxis);
          setYAxis(autoYAxis);
          
          console.log('Successfully loaded data from URL parameter with auto-detection!');
          return;
        } else {
          throw new Error('Invalid query result structure');
        }
      } catch (error) {
        console.error('Failed to parse chart data from URL:', error);
      }
    }
    
    // Fallback to mock data if no valid data found
    console.log('Using mock data as fallback');
    setChartData(mockData);
    setColumns(mockColumns);
    const { xAxis: autoXAxis, yAxis: autoYAxis } = detectAxes(
      mockColumns.map(name => ({ 
        name, 
        type: typeof (mockData[0] as any)[name] === 'number' ? 'integer' : 'varchar' 
      })),
      mockData
    );
    setXAxis(autoXAxis);
    setYAxis(autoYAxis);
  }, [searchParams, detectAxes]);

  const chartDefinition: ChartDefinition = {
    id: 'preview',
    name: chartName,
    type: chartType,
    data: chartData,
    config: {
      xAxis,
      yAxis,
    }
  };

  const handleSaveChart = async () => {
    if (!chartData.length) {
      alert('No data to save');
      return;
    }
    
    try {
      // For now, save to localStorage (in production, save to API/database)
      const savedCharts = JSON.parse(localStorage.getItem('saved-charts') || '[]');
      const newChart = {
        ...chartDefinition,
        id: `chart-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      
      savedCharts.push(newChart);
      localStorage.setItem('saved-charts', JSON.stringify(savedCharts));
      
      alert(`Chart "${chartName}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save chart:', error);
      alert('Failed to save chart');
    }
  };

  const addYAxis = (column: string) => {
    if (!yAxis.includes(column)) {
      setYAxis([...yAxis, column]);
    }
  };

  const removeYAxis = (column: string) => {
    setYAxis(yAxis.filter(col => col !== column));
  };

  return (
    <div className="p-6">
      <PageHeader 
        title="Chart Builder" 
        description="Create beautiful charts from your SQL query results"
      />
      
      <div className="flex h-full gap-6 mt-6">
        <div className="w-80 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle>Chart Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sql-studio">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to SQL Studio
                  </Link>
                </Button>
              </div>

              {/* Auto-detection message */}
              {autoDetectionMessage && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {autoDetectionMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Warning for no numeric data with suggestions */}
              {!hasNumericData && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <div className="space-y-3">
                      <p>No numeric columns detected. Charts work best with numeric data for the Y-axis.</p>
                      
                      <div>
                        <p className="text-xs font-medium mb-2">💡 <strong>Try these SQL patterns for better charts:</strong></p>
                        <div className="space-y-1 text-xs">
                          <p>� <strong>Aggregations:</strong> <code className="bg-muted px-1 py-0.5 rounded">SELECT category, COUNT(*) as total FROM table GROUP BY category</code></p>
                          <p>📈 <strong>Time Series:</strong> <code className="bg-muted px-1 py-0.5 rounded">SELECT DATE(created_at) as date, SUM(amount) as revenue FROM orders GROUP BY date</code></p>
                          <p>📉 <strong>Averages:</strong> <code className="bg-muted px-1 py-0.5 rounded">SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department</code></p>
                          <p>🔢 <strong>Numeric Fields:</strong> <code className="bg-muted px-1 py-0.5 rounded">SELECT name, age, score FROM users WHERE age > 18</code></p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        <strong>Current data:</strong> You can still manually select axes below, but charts may not render optimally.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="chartName">Chart Name</Label>
                <Input
                  id="chartName"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                  placeholder="Enter chart name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chartType">Chart Type</Label>
                <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                  <SelectTrigger id="chartType">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="donut">Donut Chart</SelectItem>
                    <SelectItem value="table">Data Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="xAxis">X-Axis (Categories)</Label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger id="xAxis">
                    <SelectValue placeholder="Select X-axis column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(column => (
                      <SelectItem key={column} value={column}>{column}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Y-Axis (Values)</Label>
                <div className="space-y-2">
                  {yAxis.map(column => (
                    <div key={column} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{column}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeYAxis(column)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Select onValueChange={addYAxis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add Y-axis column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns
                        .filter(col => col !== xAxis && !yAxis.includes(col))
                        .map(column => (
                          <SelectItem key={column} value={column}>{column}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveChart} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Chart
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartCard chart={chartDefinition} />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No data available for chart preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
