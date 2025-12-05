import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { Schema } from '@/lib/types';
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
  { params }: { params: { dbId: string } }
) {
  console.log('Schemas API called with dbId:', (await params).dbId);
  const { dbId } = await params;

  // Get connection details for this database
  const connection = getConnection(dbId);
  console.log('Found connection:', connection ? connection.name : 'none');
  
  if (!connection) {
    console.error('Database connection not found for dbId:', dbId);
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
    SELECT schema_name 
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast');
  `;

  try {
    console.log('Attempting to connect to database:', connection.host, connection.port, connection.database);
    const result = await pool.query(query);
    console.log('Query executed successfully, found', result.rows.length, 'schemas');
    
    const schemas: Schema[] = result.rows.map(row => ({
      id: row.schema_name,
      name: row.schema_name,
      databaseId: dbId,
    }));
    return NextResponse.json(schemas);
  } catch (error: any) {
    console.error('Detailed error fetching schemas:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: `Failed to fetch schemas: ${error.message}`,
      code: error.code 
    }, { status: 500 });
  } finally {
    try {
      await pool.end();
      console.log('Database pool closed successfully');
    } catch (closeError) {
      console.error('Error closing pool:', closeError);
    }
  }
}
