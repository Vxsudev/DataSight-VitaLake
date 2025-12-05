'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, Copy, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIQueryGeneratorProps {
  onQueryGenerated: (query: string) => void;
  onExecuteQuery: (query: string) => void;
  selectedDatabase?: string;
  availableSchemas?: string[];
  availableTables?: string[];
}

interface QuerySuggestion {
  question: string;
  category: string;
  description: string;
}

const SAMPLE_QUESTIONS: QuerySuggestion[] = [
  {
    question: "What is the average heart rate?",
    category: "Health",
    description: "Calculate average heart rate from health data"
  },
  {
    question: "Show me daily heart rate trends over the last month",
    category: "Health",
    description: "Time series of heart rate data grouped by day"
  },
  {
    question: "What tables are available in this database?",
    category: "Exploration",
    description: "Discover all tables and their columns"
  },
  {
    question: "Show me the structure of health data tables",
    category: "Exploration", 
    description: "Examine health-related table schemas"
  },
  {
    question: "What are the top 10 users by activity?",
    category: "Analytics",
    description: "Find most active users based on event counts"
  },
  {
    question: "Show me revenue by region for this month",
    category: "Business",
    description: "Revenue analysis grouped by geographical region"
  },
  {
    question: "How many records are in each table?",
    category: "Exploration",
    description: "Get row counts for all tables"
  },
  {
    question: "What's the latest data available?",
    category: "Exploration",
    description: "Find the most recent records across tables"
  }
];

export function AIQueryGenerator({ 
  onQueryGenerated, 
  onExecuteQuery, 
  selectedDatabase,
  availableSchemas = [],
  availableTables = []
}: AIQueryGeneratorProps) {
  const [question, setQuestion] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const generateQuery = async (inputQuestion: string) => {
    if (!inputQuestion.trim()) return;
    
    setIsGenerating(true);
    setError('');
    
    try {
      // Simulate AI query generation (in a real implementation, this would call an AI service)
      const query = await generateSQLFromQuestion(inputQuestion, selectedDatabase, availableSchemas, availableTables);
      setGeneratedQuery(query);
      onQueryGenerated(query);
    } catch (err) {
      setError('Failed to generate query. Please try rephrasing your question.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateQuery(question);
  };

  const handleSuggestionClick = (suggestion: QuerySuggestion) => {
    setQuestion(suggestion.question);
    generateQuery(suggestion.question);
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
  };

  const executeQuery = () => {
    onExecuteQuery(generatedQuery);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Query Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Natural Language Input */}
        <form onSubmit={handleQuestionSubmit} className="space-y-3">
          <div className="flex gap-3">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question in plain English... (e.g., 'What is the average heart rate?')"
              className="flex-1 h-10"
            />
            <Button 
              type="submit" 
              disabled={isGenerating || !question.trim()}
              className="px-6"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Generate SQL
            </Button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Database Context */}
        {selectedDatabase && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <strong>Connected to:</strong> {selectedDatabase}
            {availableSchemas.length > 0 && (
              <>
                {" • "}
                <strong>Schemas:</strong> {availableSchemas.join(', ')}
              </>
            )}
          </div>
        )}

        {/* Generated Query */}
        {generatedQuery && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Generated SQL Query:</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyQuery}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="default" size="sm" onClick={executeQuery}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Query
                </Button>
              </div>
            </div>
            <Textarea
              value={generatedQuery}
              onChange={(e) => setGeneratedQuery(e.target.value)}
              className="font-mono text-sm min-h-[120px]"
              placeholder="Generated SQL will appear here..."
            />
          </div>
        )}

        {/* Sample Questions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Try these questions:</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SAMPLE_QUESTIONS.map((suggestion, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-2">{suggestion.question}</p>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {suggestion.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// AI Query Generation Logic (simplified implementation)
async function generateSQLFromQuestion(
  question: string, 
  database?: string, 
  schemas: string[] = [], 
  tables: string[] = []
): Promise<string> {
  // In a real implementation, this would use OpenAI, Claude, or another AI service
  // For now, we'll use pattern matching for common questions
  
  const normalizedQuestion = question.toLowerCase();
  
  // Database exploration queries
  if (normalizedQuestion.includes('tables') || normalizedQuestion.includes('what tables')) {
    return `-- Explore available tables
SELECT 
    table_schema,
    table_name,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
    SELECT 
        table_schema, 
        table_name,
        query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name), false, true, '') as xml_count
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    AND table_type = 'BASE TABLE'
) t
ORDER BY table_schema, table_name;`;
  }
  
  if (normalizedQuestion.includes('structure') || normalizedQuestion.includes('schema') || normalizedQuestion.includes('columns')) {
    return `-- Explore table structure and columns
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name, ordinal_position;`;
  }
  
  if (normalizedQuestion.includes('count') && normalizedQuestion.includes('records')) {
    return `-- Row counts for all tables
SELECT 
    schemaname as schema_name,
    tablename as table_name,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;`;
  }
  
  if (normalizedQuestion.includes('latest') || normalizedQuestion.includes('recent') || normalizedQuestion.includes('newest')) {
    return `-- Find latest data across tables with timestamp columns
SELECT 
    table_schema,
    table_name,
    column_name as date_column
FROM information_schema.columns 
WHERE (
    column_name ILIKE '%date%' 
    OR column_name ILIKE '%time%'
    OR column_name ILIKE '%created%'
    OR column_name ILIKE '%updated%'
    OR column_name ILIKE '%modified%'
    OR data_type IN ('timestamp', 'timestamptz', 'date')
)
AND table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name;

-- To see actual latest records, use:
-- SELECT MAX([date_column]) as latest_record FROM [schema].[table_name];`;
  }
  
  // Heart rate queries
  if (normalizedQuestion.includes('heart rate') || normalizedQuestion.includes('heartrate')) {
    if (normalizedQuestion.includes('average') || normalizedQuestion.includes('avg')) {
      if (normalizedQuestion.includes('daily') || normalizedQuestion.includes('day') || normalizedQuestion.includes('trend')) {
        return `-- Daily average heart rate trends
-- First, let's find tables with heart rate data:
SELECT 
    table_schema,
    table_name,
    column_name
FROM information_schema.columns 
WHERE (
    column_name ILIKE '%heart%' 
    OR column_name ILIKE '%rate%'
    OR column_name ILIKE '%bpm%'
    OR column_name ILIKE '%pulse%'
    OR table_name ILIKE '%heart%'
    OR table_name ILIKE '%vital%'
    OR table_name ILIKE '%health%'
)
AND table_schema NOT IN ('information_schema', 'pg_catalog');

-- Common heart rate query patterns (uncomment and modify based on your table structure):

-- Pattern 1: HealthKit export format
-- SELECT 
--     DATE(startdate) as date,
--     AVG(CAST(value AS NUMERIC)) as avg_heart_rate,
--     COUNT(*) as readings_count
-- FROM public.healthkit_data 
-- WHERE type ILIKE '%heart%'
--   AND startdate >= NOW() - INTERVAL '30 days'
-- GROUP BY DATE(startdate)
-- ORDER BY date DESC;

-- Pattern 2: Generic health data
-- SELECT 
--     DATE(recorded_at) as date,
--     AVG(heart_rate) as avg_heart_rate,
--     COUNT(*) as readings_count
-- FROM public.health_data 
-- WHERE heart_rate IS NOT NULL
--   AND recorded_at >= NOW() - INTERVAL '30 days'
-- GROUP BY DATE(recorded_at)
-- ORDER BY date DESC;

-- Pattern 3: Apple Health records
-- SELECT 
--     DATE("startDate") as date,
--     AVG(CAST(value AS NUMERIC)) as avg_heart_rate,
--     COUNT(*) as readings_count
-- FROM public."HKQuantityTypeIdentifierHeartRate" 
-- WHERE value IS NOT NULL
--   AND "startDate" >= NOW() - INTERVAL '30 days'
-- GROUP BY DATE("startDate")
-- ORDER BY date DESC;`;
      } else {
        return `-- Average heart rate discovery
-- First, find heart rate data:
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE (
    column_name ILIKE '%heart%' 
    OR column_name ILIKE '%rate%'
    OR column_name ILIKE '%bpm%'
    OR column_name ILIKE '%pulse%'
    OR table_name ILIKE '%heart%'
    OR table_name ILIKE '%vital%'
    OR table_name ILIKE '%health%'
)
AND table_schema NOT IN ('information_schema', 'pg_catalog');

-- Once you identify the table, use one of these patterns:

-- Basic average (modify table/column names):
-- SELECT AVG(CAST(value AS NUMERIC)) as average_heart_rate
-- FROM public.[your_table_name] 
-- WHERE [heart_rate_column] IS NOT NULL;

-- Average with stats:
-- SELECT 
--     AVG(CAST(value AS NUMERIC)) as average_heart_rate,
--     MIN(CAST(value AS NUMERIC)) as min_heart_rate,
--     MAX(CAST(value AS NUMERIC)) as max_heart_rate,
--     COUNT(*) as total_readings
-- FROM public.[your_table_name] 
-- WHERE [heart_rate_column] IS NOT NULL;`;
      }
    }
  }
  
  // User analytics queries
  if (normalizedQuestion.includes('users') && (normalizedQuestion.includes('signup') || normalizedQuestion.includes('sign up') || normalizedQuestion.includes('register'))) {
    return `-- Daily user signups
SELECT 
    DATE(created_at) as signup_date,
    COUNT(*) as new_users
FROM public.users
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;`;
  }
  
  // Revenue queries
  if (normalizedQuestion.includes('revenue')) {
    if (normalizedQuestion.includes('region')) {
      return `-- Revenue by region
SELECT 
    region,
    SUM(amount) as total_revenue,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_transaction
FROM public.revenue
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY region
ORDER BY total_revenue DESC;`;
    } else {
      return `-- Daily revenue trends
SELECT 
    date,
    SUM(amount) as daily_revenue,
    COUNT(*) as transaction_count
FROM public.revenue
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;`;
    }
  }
  
  // User role distribution
  if (normalizedQuestion.includes('user') && normalizedQuestion.includes('role')) {
    return `-- User role distribution
SELECT 
    role,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.users), 2) as percentage
FROM public.users
WHERE role IS NOT NULL
GROUP BY role
ORDER BY user_count DESC;`;
  }
  
  // Activity queries
  if (normalizedQuestion.includes('activity') || normalizedQuestion.includes('active')) {
    return `-- Top users by activity
SELECT 
    u.name,
    u.email,
    COUNT(e.id) as event_count,
    MAX(e.created_at) as last_activity
FROM public.users u
LEFT JOIN public.events e ON u.id = e.user_id
GROUP BY u.id, u.name, u.email
ORDER BY event_count DESC
LIMIT 10;`;
  }
  
  // Default fallback with database discovery
  return `-- Database exploration query
-- First, let's see what tables are available:
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name, ordinal_position;

-- Uncomment and modify one of these common patterns:
-- SELECT COUNT(*) FROM public.[table_name];
-- SELECT * FROM public.[table_name] LIMIT 10;`;
}
