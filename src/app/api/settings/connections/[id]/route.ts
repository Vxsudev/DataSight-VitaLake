import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONNECTIONS_FILE = join(process.cwd(), 'data', 'connections.json');

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
  createdAt: string;
  updatedAt?: string;
}

// Load connections from file
function loadConnections(): DatabaseConnection[] {
  if (!existsSync(CONNECTIONS_FILE)) {
    return [];
  }
  try {
    const data = readFileSync(CONNECTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load connections:', error);
    return [];
  }
}

// Save connections to file
function saveConnections(connections: DatabaseConnection[]) {
  try {
    writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
  } catch (error) {
    console.error('Failed to save connections:', error);
    throw new Error('Failed to save connections');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const connections = loadConnections();
    
    const connectionIndex = connections.findIndex(conn => conn.id === id);
    if (connectionIndex === -1) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    connections.splice(connectionIndex, 1);
    saveConnections(connections);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.host || !body.database) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, database' },
        { status: 400 }
      );
    }

    const connections = loadConnections();
    const connectionIndex = connections.findIndex(conn => conn.id === id);
    
    if (connectionIndex === -1) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const existingConnection = connections[connectionIndex];
    
    // Check for duplicate names (excluding current connection)
    if (connections.some(conn => conn.name === body.name && conn.id !== id)) {
      return NextResponse.json(
        { error: 'A connection with this name already exists' },
        { status: 400 }
      );
    }

    // Update the connection, keeping the existing password if no new password provided
    const updatedConnection: DatabaseConnection = {
      ...existingConnection,
      name: body.name,
      type: body.type || 'postgresql',
      host: body.host,
      port: body.port || 5432,
      database: body.database,
      username: body.username || '',
      password: body.password && body.password !== '••••••••' ? body.password : existingConnection.password,
      ssl: body.ssl || false,
      updatedAt: new Date().toISOString(),
    };

    connections[connectionIndex] = updatedConnection;
    saveConnections(connections);

    // Don't return password in response
    const { password, ...safeConnection } = updatedConnection;
    
    return NextResponse.json({ 
      connection: { ...safeConnection, password: '••••••••' },
      message: 'Connection updated successfully' 
    });
  } catch (error) {
    console.error('Failed to update connection:', error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}
