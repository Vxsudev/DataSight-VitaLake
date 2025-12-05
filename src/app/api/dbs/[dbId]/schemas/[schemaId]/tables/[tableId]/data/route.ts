import { NextResponse, NextRequest } from 'next/server';
import { Pool, FieldDef } from 'pg';
import type { Column, QueryResult } from '@/lib/types';
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

function pgTypeToColumnType(pgType: number): Column['type'] {
  switch (pgType) {
    case 20: case 21: case 23: return 'integer';
    case 700: case 701: case 1700: return 'float';
    case 1082: case 1114: case 1184: return 'timestamp';
    case 16: return 'boolean';
    default: return 'varchar';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { dbId: string; schemaId: string; tableId: string } }
) {
  const { dbId, schemaId, tableId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '500';
  const offset = searchParams.get('offset') || '0';
  const limitNumber = parseInt(limit, 10);
  const offsetNumber = parseInt(offset, 10);

  if (isNaN(limitNumber) || limitNumber <= 0) {
    return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
  }

  if (isNaN(offsetNumber) || offsetNumber < 0) {
    return NextResponse.json({ error: 'Invalid offset parameter' }, { status: 400 });
  }

  if (limitNumber > 10000) {
    return NextResponse.json({ error: 'Limit cannot exceed 10,000 rows per page' }, { status: 400 });
  }

  const connection = getConnection(dbId);
  if (!connection) {
    return NextResponse.json({ error: 'Database connection not found.' }, { status: 404 });
  }

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

  const query = `SELECT * FROM "${schemaId}"."${tableId}" ORDER BY 1 LIMIT $1 OFFSET $2;`;

  try {
    const result = await pool.query(query, [limitNumber, offsetNumber]);
    
    const columns: Column[] = result.fields.map((field: FieldDef) => ({
      name: field.name,
      type: pgTypeToColumnType(field.dataTypeID)
    }));

    const queryResult: QueryResult = {
      columns,
      rows: result.rows
    };

    return NextResponse.json(queryResult);
  } catch (error: any) {
    console.error(`Error fetching data for table ${schemaId}.${tableId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
