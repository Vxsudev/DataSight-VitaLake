import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
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

export async function GET() {
  try {
    const connections = loadConnections();
    
    // Convert connections to the database format expected by the frontend
    // Only return id and name as per the Database type definition
    const databases = connections.map(conn => ({
      id: conn.id,
      name: conn.name
    }));

    return NextResponse.json(databases);
  } catch (error) {
    console.error('Failed to get databases:', error);
    return NextResponse.json(
      { error: 'Failed to load databases' },
      { status: 500 }
    );
  }
}
