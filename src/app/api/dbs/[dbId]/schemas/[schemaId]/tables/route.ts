import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { Table } from '@/lib/types';
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

function getConnection(dbId: string): DatabaseConnection | null {
  const connections = loadConnections();
  return connections.find(conn => conn.id === dbId) || null;
}

export async function GET(
  request: Request,
  { params }: { params: { dbId: string; schemaId: string } }
) {
  const { dbId, schemaId } = await params;

  // Get connection details for this database
  const connection = getConnection(dbId);
  if (!connection) {
    return NextResponse.json({ error: 'Database connection not found.' }, { status: 404 });
  }

  // Create a pool with the specific connection details
  const pool = new Pool({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    max: 1,
  });

  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1;
  `;

  try {
    const result = await pool.query(query, [schemaId]);
    const tables: Omit<Table, 'columns'>[] = result.rows.map(row => ({
      id: row.table_name,
      name: row.table_name,
      schemaId: schemaId,
    }));
    return NextResponse.json(tables);
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
