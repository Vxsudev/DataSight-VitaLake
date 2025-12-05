// Quick test of the detection logic

const testData = [
  // Test Case 1: Clear numeric data
  {
    columns: [
      { name: 'date', type: 'date' },
      { name: 'sales', type: 'integer' },
      { name: 'profit', type: 'decimal' }
    ],
    rows: [
      { date: '2023-01-01', sales: 100, profit: 25.5 },
      { date: '2023-01-02', sales: 150, profit: 30.2 },
      { date: '2023-01-03', sales: 120, profit: 28.1 }
    ]
  },
  // Test Case 2: String numbers
  {
    columns: [
      { name: 'category', type: 'varchar' },
      { name: 'count', type: 'varchar' },
      { name: 'percentage', type: 'text' }
    ],
    rows: [
      { category: 'A', count: '100', percentage: '25.5' },
      { category: 'B', count: '150', percentage: '30.2' },
      { category: 'C', count: '120', percentage: '28.1' }
    ]
  },
  // Test Case 3: No numeric data
  {
    columns: [
      { name: 'name', type: 'varchar' },
      { name: 'description', type: 'text' },
      { name: 'status', type: 'varchar' }
    ],
    rows: [
      { name: 'John', description: 'Manager', status: 'Active' },
      { name: 'Jane', description: 'Developer', status: 'Active' },
      { name: 'Bob', description: 'Designer', status: 'Inactive' }
    ]
  }
];

const categoricalTypes = ['varchar', 'text', 'string', 'date', 'timestamp', 'timestamptz', 'char'];
const numericTypes = ['integer', 'float', 'decimal', 'bigint', 'real', 'double', 'numeric', 'int', 'smallint'];

function analyzeColumn(col, rows) {
  console.log('Analyzing column:', { name: col.name, type: col.type });
  
  // First, analyze actual data values (prioritize content over DB type)
  const sampleValues = rows.slice(0, 10).map(row => row[col.name]);
  const validValues = sampleValues.filter(val => val !== null && val !== undefined && val !== '');
  
  if (validValues.length === 0) {
    return { type: 'unknown', confidence: 'low', reason: 'No valid values found' };
  }
  
  const numericCount = validValues.filter(val => {
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
      const parsed = Number(val);
      return !isNaN(parsed) && isFinite(parsed);
    }
    return false;
  }).length;
  
  const numericRatio = numericCount / validValues.length;
  
  // Data content analysis takes priority
  if (numericRatio >= 0.6) {
    return { type: 'numeric', confidence: numericRatio >= 0.9 ? 'high' : 'medium', reason: `${Math.round(numericRatio * 100)}% numeric values (data analysis)` };
  } else if (numericCount > 0) {
    return { type: 'numeric', confidence: 'low', reason: `${numericCount} numeric values found (${Math.round(numericRatio * 100)}%) (data analysis)` };
  }
  
  // Fall back to database type analysis if data content is inconclusive
  const dbType = col.type?.toLowerCase() || '';
  
  if (categoricalTypes.some(type => dbType.includes(type))) {
    return { type: 'categorical', confidence: 'medium', reason: `Database type: ${col.type}` };
  }
  
  if (numericTypes.some(type => dbType.includes(type))) {
    return { type: 'numeric', confidence: 'high', reason: `Database type: ${col.type}` };
  }
  
  return { type: 'categorical', confidence: 'low', reason: 'Mixed or text values' };
}

testData.forEach((test, index) => {
  console.log(`\n--- Test Case ${index + 1} ---`);
  const columnAnalysis = test.columns.map(col => ({
    ...col,
    analysis: analyzeColumn(col, test.rows)
  }));
  
  console.log('Column Analysis:', columnAnalysis);
  
  const numericColumns = columnAnalysis.filter(col => col.analysis.type === 'numeric');
  const categoricalColumns = columnAnalysis.filter(col => col.analysis.type === 'categorical');
  
  console.log('Numeric columns:', numericColumns.map(c => c.name));
  console.log('Categorical columns:', categoricalColumns.map(c => c.name));
  
  const selectedXAxis = categoricalColumns.length > 0 ? categoricalColumns[0].name : (columnAnalysis.length > 0 ? columnAnalysis[0].name : '');
  const selectedYAxis = numericColumns.length > 0 ? numericColumns.map(col => col.name) : [];
  
  console.log('Selected X-axis:', selectedXAxis);
  console.log('Selected Y-axis:', selectedYAxis);
  console.log('Has numeric data:', numericColumns.length > 0);
});
