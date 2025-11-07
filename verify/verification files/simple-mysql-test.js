// simple-mysql-test.js
require('dotenv').config();
const mysql = require('mysql2');

console.log('Testing MySQL connection...');
console.log('Using credentials from .env file:');
console.log('- Host:', process.env.DB_HOST || 'localhost');
console.log('- User:', process.env.DB_USER || 'root');
console.log('- Database:', process.env.DB_NAME || 'sotc');

// Create connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sotc'
});

// Attempt to connect
connection.connect(function(err) {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  
  console.log('Connected to MySQL successfully!');
  
  // Test a simple query
  connection.query('SELECT 1 + 1 AS solution', function(err, results) {
    if (err) {
      console.error('Query error:', err);
      return;
    }
    
    console.log('Query result:', results[0].solution);
    
    // Close connection
    connection.end(function(err) {
      if (err) {
        console.error('Error closing connection:', err);
        return;
      }
      console.log('Connection closed successfully');
    });
  });
});
