import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { Column } from '@/lib/types';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_URL?.includes('localhost') || process.env.POSTGRES_URL?.includes('sslmode=disable') 
    ? false 
    : {
        rejectUnauthorized: false,
      },
});

function mapPostgresType(pgType: string): Column['type'] {
  if (pgType.includes('char') || pgType.includes('text')) {
    return 'varchar';
  }
  if (pgType.includes('int') || pgType.includes('serial')) {
    return 'integer';
  }
  if (pgType.includes('numeric') || pgType.includes('decimal') || pgType.includes('float') || pgType.includes('double')) {
    return 'float';
  }
  if (pgType.includes('timestamp') || pgType.includes('date')) {
    return 'timestamp';
  }
  if (pgType.includes('boolean')) {
    return 'boolean';
  }
  return 'varchar'; // Default fallback
}

export async function GET(
  request: Request,
  { params }: { params: { schemaId: string; tableId: string } }
) {
  const { schemaId, tableId } = await params;

  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ error: 'Database connection string is not configured.' }, { status: 500 });
  }

  const query = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = $1 AND table_name = $2;
  `;

  try {
    const result = await pool.query(query, [schemaId, tableId]);
    const columns: Column[] = result.rows.map(row => ({
      name: row.column_name,
      type: mapPostgresType(row.data_type),
    }));
    return NextResponse.json(columns);
  } catch (error: any) {
    console.error(`Error fetching columns for table ${schemaId}.${tableId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
