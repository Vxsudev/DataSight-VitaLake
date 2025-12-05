'use server';
import { NextResponse } from 'next/server';
import { Pool, FieldDef } from 'pg';
import type { Column, QueryResult } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';

function getStoredConnections() {
  try {
    const filePath = join(process.cwd(), 'data', 'connections.json');
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function pgTypeToColumnType(pgType: number): Column['type'] {
  // OID values from pg-types
  // https://github.com/brianc/node-pg-types/blob/master/lib/builtins.js
  switch (pgType) {
    case 20: // int8
    case 21: // int2
    case 23: // int4
      return 'integer';
    case 700: // float4
    case 701: // float8
    case 1700: // numeric
      return 'float';
    case 1082: // date
    case 1114: // timestamp
    case 1184: // timestamptz
      return 'timestamp';
    case 16: // bool
      return 'boolean';
    default:
      return 'varchar';
  }
}

export async function POST(request: Request) {
  const { query, dbId } = await request.json();

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Invalid query parameter' }, { status: 400 });
  }

  // Get database connection details
  let connectionConfig;
  
  if (dbId) {
    const connections = getStoredConnections();
    const connection = connections.find((conn: any) => conn.id === dbId);
    
    if (!connection) {
      return NextResponse.json({ error: 'Database connection not found' }, { status: 404 });
    }
    
    connectionConfig = {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    };
  } else {
    // Fallback to environment variables if no dbId provided
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
    }
    
    connectionConfig = {
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.POSTGRES_URL?.includes('localhost') || process.env.POSTGRES_URL?.includes('sslmode=disable') 
        ? false 
        : {
            rejectUnauthorized: false,
          },
    };
  }

  const pool = new Pool(connectionConfig);

  try {
    const start = Date.now();
    const result = await pool.query(query);
    const duration = Date.now() - start;

    const columns: Column[] = result.fields.map((field: FieldDef) => ({
      name: field.name,
      type: pgTypeToColumnType(field.dataTypeID),
    }));

    const queryResult: QueryResult = {
      columns,
      rows: result.rows,
    };
    
    console.log(`Executed query in ${duration}ms: ${query}`);

    return NextResponse.json(queryResult);
  } catch (error: any) {
    console.error('Error executing query:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Close the pool to avoid connection leaks
    try {
      await pool.end();
    } catch (closeError) {
      console.error('Error closing database pool:', closeError);
    }
  }
}
