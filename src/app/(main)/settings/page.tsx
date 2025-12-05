'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Database, Plus, Trash2, Eye, EyeOff, Settings, CheckCircle, XCircle, Loader2, Edit } from 'lucide-react';

interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  status?: 'connected' | 'disconnected' | 'testing';
  lastTested?: Date;
}

const defaultConnection: Omit<DatabaseConnection, 'id'> = {
  name: '',
  type: 'postgresql',
  host: '',
  port: 5432,
  database: '',
  username: '',
  password: '',
  ssl: false,
};

export default function SettingsPage() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [newConnection, setNewConnection] = useState<Omit<DatabaseConnection, 'id'>>(defaultConnection);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/settings/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load database connections',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.host || !newConnection.database) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/settings/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConnection),
      });

      if (response.ok) {
        const data = await response.json();
        setConnections([...connections, data.connection]);
        setNewConnection(defaultConnection);
        toast({
          title: 'Success',
          description: 'Database connection added successfully',
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Failed to add connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to add database connection',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/connections/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConnections(connections.filter(conn => conn.id !== id));
        toast({
          title: 'Success',
          description: 'Database connection deleted successfully',
        });
      } else {
        throw new Error('Failed to delete connection');
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete database connection',
        variant: 'destructive',
      });
    }
  };

  const handleEditConnection = async () => {
    if (!editingConnection) return;

    if (!editingConnection.name || !editingConnection.host || !editingConnection.database) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/settings/connections/${editingConnection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConnection),
      });

      if (response.ok) {
        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response:', responseText);
          throw new Error('Invalid response from server');
        }
        
        setConnections(connections.map(conn => 
          conn.id === editingConnection.id ? data.connection : conn
        ));
        setEditingConnection(null);
        toast({
          title: 'Success',
          description: 'Database connection updated successfully',
        });
      } else {
        const responseText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Server error: ${response.status}`);
        }
        throw new Error(errorData.error || errorData.message || 'Failed to update connection');
      }
    } catch (error) {
      console.error('Failed to update connection:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update database connection',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async (connection: DatabaseConnection) => {
    setTestingConnection(connection.id);
    
    try {
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connection),
      });

      const result = await response.json();
      
      // Update connection status
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connection.id 
            ? { ...conn, status: result.success ? 'connected' : 'disconnected', lastTested: new Date() }
            : conn
        )
      );

      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Failed to test connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to test database connection',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const getStatusBadge = (connection: DatabaseConnection) => {
    switch (connection.status) {
      case 'connected':
        return <Badge variant="secondary" className="text-green-600 bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary" className="text-red-600 bg-red-100"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'testing':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage database connections and application settings"
      >
        <Settings className="h-6 w-6" />
      </PageHeader>

      <Tabs defaultValue="databases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="databases">Database Connections</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="databases" className="space-y-6">
          {/* Add New Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Database Connection
              </CardTitle>
              <CardDescription>
                Connect to a new database to explore and analyze data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Connection Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Database"
                    value={newConnection.name}
                    onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Database Type</Label>
                  <Select
                    value={newConnection.type}
                    onValueChange={(value: DatabaseConnection['type']) => {
                      const defaultPorts = { postgresql: 5432, mysql: 3306, sqlite: 0, mongodb: 27017 };
                      setNewConnection({ 
                        ...newConnection, 
                        type: value, 
                        port: defaultPorts[value] 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="host">Host *</Label>
                  <Input
                    id="host"
                    placeholder="localhost"
                    value={newConnection.host}
                    onChange={(e) => setNewConnection({ ...newConnection, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={newConnection.port}
                    onChange={(e) => setNewConnection({ ...newConnection, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="database">Database Name *</Label>
                <Input
                  id="database"
                  placeholder="my_database"
                  value={newConnection.database}
                  onChange={(e) => setNewConnection({ ...newConnection, database: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username"
                    value={newConnection.username}
                    onChange={(e) => setNewConnection({ ...newConnection, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="password"
                      value={newConnection.password}
                      onChange={(e) => setNewConnection({ ...newConnection, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ssl"
                  checked={newConnection.ssl}
                  onChange={(e) => setNewConnection({ ...newConnection, ssl: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="ssl">Use SSL/TLS</Label>
              </div>

              <Button onClick={handleAddConnection} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </CardContent>
          </Card>

          {/* Existing Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Existing Connections ({connections.length})
              </CardTitle>
              <CardDescription>
                Manage your database connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No database connections configured</p>
                  <p className="text-sm">Add your first connection above to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div key={connection.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="font-medium">{connection.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {connection.type} • {connection.host}:{connection.port} • {connection.database}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {connection.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(connection)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          {connection.lastTested && (
                            <span>Last tested: {connection.lastTested.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(connection)}
                            disabled={testingConnection === connection.id}
                          >
                            {testingConnection === connection.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Test Connection'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingConnection(connection)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the connection "{connection.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteConnection(connection.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>General settings coming soon</p>
                <p className="text-sm">Theme preferences, query limits, and more</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Connection Dialog */}
      <Dialog open={!!editingConnection} onOpenChange={(open) => !open && setEditingConnection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Database Connection
            </DialogTitle>
            <DialogDescription>
              Update the connection details for "{editingConnection?.name}"
            </DialogDescription>
          </DialogHeader>
          
          {editingConnection && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Connection Name *</Label>
                  <Input
                    id="edit-name"
                    placeholder="My Database"
                    value={editingConnection.name}
                    onChange={(e) => setEditingConnection({ ...editingConnection, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Database Type</Label>
                  <Select
                    value={editingConnection.type}
                    onValueChange={(value: DatabaseConnection['type']) => {
                      const defaultPorts = { postgresql: 5432, mysql: 3306, sqlite: 0, mongodb: 27017 };
                      setEditingConnection({ 
                        ...editingConnection, 
                        type: value, 
                        port: defaultPorts[value] 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-host">Host *</Label>
                  <Input
                    id="edit-host"
                    placeholder="localhost"
                    value={editingConnection.host}
                    onChange={(e) => setEditingConnection({ ...editingConnection, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-port">Port</Label>
                  <Input
                    id="edit-port"
                    type="number"
                    value={editingConnection.port}
                    onChange={(e) => setEditingConnection({ ...editingConnection, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-database">Database Name *</Label>
                <Input
                  id="edit-database"
                  placeholder="my_database"
                  value={editingConnection.database}
                  onChange={(e) => setEditingConnection({ ...editingConnection, database: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    placeholder="username"
                    value={editingConnection.username}
                    onChange={(e) => setEditingConnection({ ...editingConnection, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Enter new password (leave blank to keep current)"
                      value={editingConnection.password === '••••••••' ? '' : editingConnection.password}
                      onChange={(e) => setEditingConnection({ ...editingConnection, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to keep current password</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-ssl"
                  checked={editingConnection.ssl}
                  onChange={(e) => setEditingConnection({ ...editingConnection, ssl: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-ssl">Use SSL/TLS</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConnection(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditConnection}>
              <Edit className="h-4 w-4 mr-2" />
              Update Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
