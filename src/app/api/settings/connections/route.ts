import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

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
}

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    require('fs').mkdirSync(dataDir, { recursive: true });
  }
}

// Load connections from file
function loadConnections(): DatabaseConnection[] {
  ensureDataDir();
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
  ensureDataDir();
  try {
    writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
  } catch (error) {
    console.error('Failed to save connections:', error);
    throw new Error('Failed to save connections');
  }
}

export async function GET() {
  try {
    const connections = loadConnections();
    
    // Don't return passwords in the response for security
    const safeConnections = connections.map(({ password, ...conn }) => ({
      ...conn,
      password: '••••••••' // Mask password
    }));

    return NextResponse.json({ connections: safeConnections });
  } catch (error) {
    console.error('Failed to get connections:', error);
    return NextResponse.json(
      { error: 'Failed to load connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.host || !body.database) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, database' },
        { status: 400 }
      );
    }

    const connections = loadConnections();
    
    // Check for duplicate names
    if (connections.some(conn => conn.name === body.name)) {
      return NextResponse.json(
        { error: 'A connection with this name already exists' },
        { status: 400 }
      );
    }

    const newConnection: DatabaseConnection = {
      id: randomUUID(),
      name: body.name,
      type: body.type || 'postgresql',
      host: body.host,
      port: body.port || 5432,
      database: body.database,
      username: body.username || '',
      password: body.password || '',
      ssl: body.ssl || false,
      createdAt: new Date().toISOString(),
    };

    connections.push(newConnection);
    saveConnections(connections);

    // Return without password
    const { password, ...safeConnection } = newConnection;
    return NextResponse.json({ 
      connection: { ...safeConnection, password: '••••••••' }
    });
  } catch (error) {
    console.error('Failed to create connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}
