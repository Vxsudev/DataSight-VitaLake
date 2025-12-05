-- Sample database initialization script for DataSight-VitaLake
-- This script will be automatically executed when the PostgreSQL container starts

-- Create sample database and schema
CREATE DATABASE IF NOT EXISTS sample_analytics;

-- Connect to the database
\c sample_analytics;

-- Create sample schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create sample tables with data for testing
CREATE TABLE IF NOT EXISTS analytics.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    department VARCHAR(50),
    role VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS analytics.events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES analytics.users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS analytics.revenue (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    source VARCHAR(50),
    region VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO analytics.users (name, email, department, role, created_at, last_login) VALUES
('John Doe', 'john@company.com', 'Engineering', 'Developer', '2024-01-01', '2024-12-04'),
('Jane Smith', 'jane@company.com', 'Marketing', 'Manager', '2024-01-15', '2024-12-03'),
('Bob Johnson', 'bob@company.com', 'Sales', 'Representative', '2024-02-01', '2024-12-04'),
('Alice Brown', 'alice@company.com', 'Engineering', 'Senior Developer', '2024-01-10', '2024-12-04'),
('Charlie Wilson', 'charlie@company.com', 'Marketing', 'Analyst', '2024-03-01', '2024-12-02');

INSERT INTO analytics.events (user_id, event_type, event_data, created_at, session_id) VALUES
(1, 'login', '{"ip": "192.168.1.1"}', '2024-12-04 09:00:00', 'sess_001'),
(1, 'page_view', '{"page": "/dashboard"}', '2024-12-04 09:01:00', 'sess_001'),
(2, 'login', '{"ip": "192.168.1.2"}', '2024-12-04 08:30:00', 'sess_002'),
(2, 'click', '{"button": "export_report"}', '2024-12-04 08:35:00', 'sess_002'),
(3, 'login', '{"ip": "192.168.1.3"}', '2024-12-04 10:00:00', 'sess_003');

INSERT INTO analytics.revenue (date, amount, source, region) VALUES
('2024-12-01', 1500.00, 'online', 'US'),
('2024-12-01', 800.00, 'retail', 'EU'),
('2024-12-02', 2200.00, 'online', 'US'),
('2024-12-02', 1100.00, 'online', 'EU'),
('2024-12-03', 1800.00, 'retail', 'US'),
('2024-12-04', 2500.00, 'online', 'US');

-- Create indexes for better query performance
CREATE INDEX idx_users_department ON analytics.users(department);
CREATE INDEX idx_users_created_at ON analytics.users(created_at);
CREATE INDEX idx_events_user_id ON analytics.events(user_id);
CREATE INDEX idx_events_type_date ON analytics.events(event_type, created_at);
CREATE INDEX idx_revenue_date ON analytics.revenue(date);
CREATE INDEX idx_revenue_source ON analytics.revenue(source);

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA analytics TO datasight;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO datasight;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA analytics TO datasight;
