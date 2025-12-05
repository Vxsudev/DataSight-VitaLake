'use client';

import React, { useState, useTransition, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DbExplorer } from '@/components/dbs/db-explorer';
import { SqlEditor } from '@/components/shared/sql-editor';
import { DataTable } from '@/components/dbs/data-table';
import { AIQueryGenerator } from '@/components/shared/ai-query-generator';
import { ErrorPopup, useErrorNotifications } from '@/components/shared/error-popup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Play, AlertTriangle, Table2, BarChart, Info, Download, History, Database, CheckCircle, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { runSql } from '@/lib/data';
import type { QueryResult } from '@/lib/types';
import Link from 'next/link';

function SqlStudioContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  const [sql, setSql] = useState(initialQuery);
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
  const [databases, setDatabases] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, { healthy: boolean; latency?: number; error?: string }>>({});
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  // Error notification system
  const { errors, addError, dismissError, dismissAll } = useErrorNotifications();

  // Test database connection
  const checkConnectionHealth = async (dbId: string) => {
    try {
      const response = await fetch(`/api/dbs/${dbId}/health`);
      const health = await response.json();
      setConnectionStatus(prev => ({
        ...prev,
        [dbId]: health
      }));
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [dbId]: { healthy: false, error: 'Failed to check connection' }
      }));
    }
  };

  // Load databases on mount
  useEffect(() => {
    const loadDatabases = async () => {
      try {
        const response = await fetch('/api/dbs');
        const dbList = await response.json();
        setDatabases(dbList);
        if (dbList.length > 0 && !selectedDbId) {
          setSelectedDbId(dbList[0].id);
        }
        
        // Check connection health for all databases
        dbList.forEach((db: any) => {
          checkConnectionHealth(db.id);
        });
      } catch (error) {
        console.error('Failed to load databases:', error);
      }
    };
    loadDatabases();
  }, [selectedDbId]);

  // Load query history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sql-studio-history');
    if (saved) {
      try {
        setQueryHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse query history:', e);
      }
    }
  }, []);

  // Save query to history
  const saveQueryToHistory = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...queryHistory.filter(q => q !== query)].slice(0, 10); // Keep last 10
    setQueryHistory(newHistory);
    localStorage.setItem('sql-studio-history', JSON.stringify(newHistory));
  };

  const handleRunQuery = () => {
    if (!selectedDbId) {
      setError('Please select a database first.');
      addError(400, 'Please select a database first.', 'Database selection is required to execute queries');
      return;
    }

    if (!sql.trim()) {
      setError('Please enter a SQL query.');
      addError(400, 'Please enter a SQL query.', 'Query cannot be empty');
      return;
    }

    // Check if database connection is healthy
    const dbStatus = selectedDbId ? connectionStatus[selectedDbId] : null;
    if (dbStatus && !dbStatus.healthy) {
      const errorMsg = `Cannot execute query: Database connection failed. ${dbStatus.error || 'Please check your connection settings.'}`;
      setError(errorMsg);
      addError(503, 'Database Connection Failed', dbStatus.error || 'Please check your connection settings');
      return;
    }

    startTransition(async () => {
      setError(null);
      const start = Date.now();
      try {
        const queryResult = await runSql(sql, selectedDbId);
        setResult(queryResult);
        const executionTimeMs = Date.now() - start;
        setExecutionTime(executionTimeMs);
        saveQueryToHistory(sql);
        
        // Show success notification
        addError(200, 'Query executed successfully', `${queryResult.rows.length} rows returned in ${executionTimeMs}ms`, 'success');
      } catch (e: any) {
        let errorMessage = e.message || 'Failed to execute query.';
        let statusCode = e.statusCode || 500; // Extract status code from error or default to 500
        
        // Enhance error messages based on common database errors
        let details = '';
        if (errorMessage.includes('ECONNREFUSED')) {
          errorMessage = 'Database connection refused';
          details = 'Please check if the database server is running and accessible';
          statusCode = 503;
        } else if (errorMessage.includes('ENOTFOUND')) {
          errorMessage = 'Database host not found';
          details = 'Please verify the host address in your connection settings';
          statusCode = 404;
        } else if (errorMessage.includes('authentication failed')) {
          errorMessage = 'Authentication failed';
          details = 'Please check your username and password';
          statusCode = 401;
        } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
          errorMessage = `Database "${selectedDatabase?.name}" does not exist`;
          details = 'Please check your database name';
          statusCode = 404;
        } else if (errorMessage.includes('permission denied')) {
          errorMessage = 'Permission denied';
          details = 'Your user account may not have sufficient privileges to execute this query';
          statusCode = 403;
        } else if (errorMessage.includes('syntax error')) {
          errorMessage = 'SQL syntax error';
          details = 'Please check your SQL query syntax';
          statusCode = 400;
        }
        
        setError(errorMessage);
        setResult(null);
        setExecutionTime(null);
        
        // Add error notification
        addError(statusCode, errorMessage, details);
        
        // Re-check connection health if query fails
        if (selectedDbId) {
          checkConnectionHealth(selectedDbId);
        }
      }
    });
  };

  // Export data as CSV
  const exportAsCSV = () => {
    if (!result || !result.rows.length) return;
    
    const headers = result.columns.map(col => col.name).join(',');
    const rows = result.rows.map(row => 
      result.columns.map(col => {
        const value = row[col.name];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export data as JSON
  const exportAsJSON = () => {
    if (!result || !result.rows.length) return;
    
    const json = JSON.stringify(result.rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Create chart with safe data passing
  const createChart = () => {
    console.log('=== CREATE CHART DEBUG ===');
    console.log('Result exists:', !!result);
    console.log('Result structure:', result ? {
      hasColumns: !!result.columns,
      hasRows: !!result.rows,
      columnsCount: result.columns?.length,
      rowsCount: result.rows?.length,
      columnNames: result.columns?.map(c => c.name),
      firstRowSample: result.rows?.[0]
    } : null);
    
    if (!result) {
      console.log('No result to create chart from!');
      return;
    }
    
    try {
      const dataString = JSON.stringify(result);
      console.log('Data string length:', dataString.length);
      console.log('Data string preview:', dataString.substring(0, 200));
      
      // Always use sessionStorage to avoid encoding issues with special characters
      const chartDataId = `chart-data-${Date.now()}`;
      console.log('Using sessionStorage with ID:', chartDataId);
      sessionStorage.setItem(chartDataId, dataString);
      const url = `/chart-builder?chartDataId=${chartDataId}`;
      console.log('Opening URL:', url);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to create chart:', error);
      // Fallback: just open chart builder without data
      console.log('Opening fallback chart builder');
      window.open('/chart-builder', '_blank');
    }
  };
  
  const canCreateChart = result && result.rows.length > 0;
  console.log('SQL Studio Debug - Can Create Chart:', {
    hasResult: !!result,
    hasRows: !!(result?.rows?.length),
    rowsCount: result?.rows?.length,
    columnsCount: result?.columns?.length,
    canCreateChart
  });
  const isLargeResult = result && result.rows.length > 5000;
  const selectedDatabase = databases.find(db => db.id === selectedDbId);

  return (
    <>
      {/* Error Notifications */}
      <ErrorPopup 
        errors={errors}
        onDismiss={dismissError}
        onDismissAll={dismissAll}
      />
      
      <div className="flex h-[calc(100vh-10rem)] gap-6 w-full min-w-0 overflow-hidden">
      <div className="w-80 flex-shrink-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Query Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Database Selection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </CardTitle>
              {selectedDbId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => checkConnectionHealth(selectedDbId)}
                  className="h-auto p-1"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="database-select">Select Database</Label>
                <Select value={selectedDbId || ''} onValueChange={setSelectedDbId}>
                  <SelectTrigger id="database-select">
                    <SelectValue placeholder="Choose a database..." />
                  </SelectTrigger>
                  <SelectContent>
                    {databases.map((db) => {
                      const status = connectionStatus[db.id];
                      return (
                        <SelectItem key={db.id} value={db.id}>
                          <div className="flex items-center gap-2">
                            {status?.healthy === true && <CheckCircle className="h-3 w-3 text-green-500" />}
                            {status?.healthy === false && <XCircle className="h-3 w-3 text-red-500" />}
                            {status === undefined && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            <span>{db.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedDatabase && selectedDbId && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Connected to: {selectedDatabase.name}
                    </p>
                    {connectionStatus[selectedDbId] && (
                      <div className="flex items-center gap-2 text-xs">
                        {connectionStatus[selectedDbId].healthy ? (
                          <>
                            <Wifi className="h-3 w-3 text-green-500" />
                            <span className="text-green-600">Connected</span>
                            {connectionStatus[selectedDbId].latency && (
                              <span className="text-muted-foreground">
                                ({connectionStatus[selectedDbId].latency}ms)
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3 text-red-500" />
                            <span className="text-red-600">Connection Failed</span>
                            {connectionStatus[selectedDbId].error && (
                              <span className="text-red-600 block mt-1">
                                {connectionStatus[selectedDbId].error}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Query History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Query History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queryHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No queries yet</p>
              ) : (
                queryHistory.slice(0, 10).map((query, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => setSql(query)}
                  >
                    <span className="truncate text-xs">
                      {query.length > 50 ? `${query.substring(0, 50)}...` : query}
                    </span>
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Schema Explorer */}
          <Card>
            <CardHeader>
              <CardTitle>Schema Explorer</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDbId ? (
                <DbExplorer selectedDbId={selectedDbId} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a database to explore its structure
                </p>
              )}
            </CardContent>
          </Card>
          </CardContent>
        </Card>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <SqlEditor 
                value={sql} 
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSql(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunQuery();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Use Ctrl+Enter (⌘+Enter on Mac) to run the query. 
                    {selectedDbId && connectionStatus[selectedDbId]?.healthy && (
                      <span className="ml-2 text-green-600">✓ Connected</span>
                    )}
                  </p>
                  {executionTime && (
                    <p className="text-xs text-muted-foreground">
                      Last query executed in {executionTime.toLocaleString()}ms
                    </p>
                  )}
                  {!selectedDbId && (
                    <p className="text-xs text-orange-600">
                      Please select a database to run queries.
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleRunQuery} 
                  disabled={isPending || !selectedDbId || (selectedDbId ? (connectionStatus[selectedDbId] && !connectionStatus[selectedDbId].healthy) : false)}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run Query
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Query Generator - Horizontal Layout */}
        <AIQueryGenerator
          selectedDatabase={selectedDatabase?.name}
          onQueryGenerated={(query) => setSql(query)}
          onExecuteQuery={(query) => {
            setSql(query);
            setTimeout(() => handleRunQuery(), 100); // Small delay to ensure SQL is set
          }}
        />

        {isPending && (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Query Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{error}</p>
                {error.includes('relation') && error.includes('does not exist') && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Tip:</strong> Use the Schema Explorer to find the correct table names. 
                      Remember to include schema names if needed (e.g., <code>schema.table</code>).
                    </AlertDescription>
                  </Alert>
                )}
                {error.includes('syntax error') && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Tip:</strong> Check your SQL syntax. Common issues include missing quotes, 
                      incorrect column names, or unsupported functions.
                    </AlertDescription>
                  </Alert>
                )}
                {error.includes('connection') && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Connection Issue:</strong> Try refreshing the database connection using the refresh button 
                      next to the database selector. Check if your database server is running and accessible.
                    </AlertDescription>
                  </Alert>
                )}
                {error.includes('permission') && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Permission Denied:</strong> Your database user may not have sufficient privileges. 
                      Contact your database administrator or check user permissions.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            {isLargeResult && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Large result set detected ({result.rows.length.toLocaleString()} rows). 
                  Consider adding LIMIT clauses to improve performance. 
                  The table below supports horizontal scrolling for better navigation.
                </AlertDescription>
              </Alert>
            )}
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-4 w-4" /> 
                  Query Results
                  <span className="text-sm font-normal text-muted-foreground">
                    ({result.rows.length.toLocaleString()} rows × {result.columns.length} columns)
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportAsCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportAsJSON}>
                    <Download className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                  {canCreateChart && (
                    <Button variant="outline" size="sm" onClick={() => {
                      console.log('CREATE CHART BUTTON CLICKED!');
                      createChart();
                    }}>
                      <BarChart className="mr-2 h-4 w-4" />
                      Create Chart
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="w-full overflow-hidden h-96 p-0">
                <DataTable 
                  columns={result.columns} 
                  rows={result.rows}
                  className="h-full w-full"
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
    </>
  );
}


export default function SqlStudioPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SqlStudioContent />
        </Suspense>
    )
}
