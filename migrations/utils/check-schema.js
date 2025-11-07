// Create a file called check-schema.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'data', 'sotc.db');

// Open database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  
  console.log(`Connected to SQLite database at ${dbPath}`);
  
  // Get table info
  db.all("PRAGMA table_info(gold_history)", [], (err, rows) => {
    if (err) {
      console.error('Error getting table info:', err);
      return;
    }
    
    console.log('gold_history table columns:');
    rows.forEach(row => {
      console.log(`- ${row.name} (${row.type})`);
    });
    
    // Close connection
    db.close();
  });
});
