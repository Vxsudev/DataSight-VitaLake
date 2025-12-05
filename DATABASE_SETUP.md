# PostgreSQL Database Connection Setup

This guide will help you connect your existing PostgreSQL database to the DataSight-VitaLake frontend.

## Prerequisites

- PostgreSQL database running (locally or remotely)
- Database credentials (username, password, host, port, database name)
- Network access from this application to your database

## Frontend Setup (DataSight-VitaLake)

### 1. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your PostgreSQL connection details:
   ```env
   POSTGRES_URL=postgresql://username:password@host:port/database_name
   ```

### Example Connection Strings:

#### Local PostgreSQL:
```env
POSTGRES_URL=postgresql://postgres:mypassword@localhost:5432/mydatabase
```

#### Remote PostgreSQL:
```env
POSTGRES_URL=postgresql://myuser:mypassword@192.168.1.100:5432/mydatabase
```

#### Cloud PostgreSQL (with SSL):
```env
POSTGRES_URL=postgresql://user:pass@hostname:5432/dbname?sslmode=require
```

### 2. Restart the Development Server

After updating `.env.local`, restart your Next.js development server:
```bash
npm run dev
```

## Database Requirements

Your PostgreSQL database should be accessible and have:

### Required Permissions:
The database user needs these permissions:
- `SELECT` on all tables you want to query
- `SELECT` on `information_schema` views (for schema exploration)
- Access to `information_schema.schemata`
- Access to `information_schema.tables`
- Access to `information_schema.columns`

### Recommended Database Setup:

#### Create a dedicated read-only user for the application:

```sql
-- Create a new user for the application
CREATE USER datasight_readonly WITH PASSWORD 'secure_password_here';

-- Grant connect permission
GRANT CONNECT ON DATABASE your_database_name TO datasight_readonly;

-- Grant usage on schemas you want to expose
GRANT USAGE ON SCHEMA public TO datasight_readonly;
GRANT USAGE ON SCHEMA your_other_schema TO datasight_readonly;

-- Grant select permissions on all tables in the schemas
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datasight_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA your_other_schema TO datasight_readonly;

-- Grant select on future tables (optional)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datasight_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA your_other_schema GRANT SELECT ON TABLES TO datasight_readonly;
```

#### If you want to allow custom SQL queries (SQL Studio feature):
```sql
-- For read-only access to all schemas
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO datasight_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA pg_catalog TO datasight_readonly;
```

## Network Configuration

### For Local Databases:
1. Ensure PostgreSQL is accepting connections:
   - Check `postgresql.conf`: `listen_addresses = 'localhost'` or `'*'`
   - Check `pg_hba.conf`: Allow connections from your application

### For Remote Databases:
1. Ensure firewall allows connections on PostgreSQL port (default: 5432)
2. Configure `pg_hba.conf` to allow connections from the application server's IP
3. Consider using SSL/TLS for security

### For Cloud Databases:
1. Add your application server's IP to the allowlist
2. Use SSL connection (usually required)
3. Use the provided connection string format

## Testing the Connection

1. Navigate to `/dbs` in your application
2. You should see your database listed
3. Click on it to explore schemas and tables
4. Use the SQL Studio (`/sql-studio`) to run test queries

## Troubleshooting

### Common Issues:

1. **"Database connection string is not configured"**
   - Ensure `.env.local` exists and has `POSTGRES_URL` set
   - Restart the development server

2. **Connection timeout/refused**
   - Check if PostgreSQL is running
   - Verify host, port, and network connectivity
   - Check firewall settings

3. **Authentication failed**
   - Verify username and password
   - Check `pg_hba.conf` authentication method

4. **SSL connection errors**
   - For local databases, try without SSL: `?sslmode=disable`
   - For cloud databases, ensure SSL is properly configured

5. **Permission denied on schema/table**
   - Grant appropriate SELECT permissions to your user
   - Check schema access permissions

## Security Notes

- Never commit `.env.local` to version control
- Use a read-only database user
- Consider IP whitelisting for production
- Use SSL for connections over the internet
- Regularly rotate database passwords
