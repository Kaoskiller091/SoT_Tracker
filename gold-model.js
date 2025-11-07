// gold-model.js - Handles gold tracking
const dbManager = require('./database');

class GoldModel {
  constructor() {
    this.initialized = false;
    this.amountColumnName = 'gold_amount'; // Default column name
  }
  
  // Initialize the model
  async init() {
    if (this.initialized) return;
    
    try {
      // Check if table exists
      const tableExists = await this.tableExists('gold_history');
      
      if (!tableExists) {
        // Create gold_history table with correct schema
        await dbManager.run(`
          CREATE TABLE IF NOT EXISTS gold_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            discord_id VARCHAR(20) NOT NULL,
            gold_amount INT NOT NULL,
            change_amount INT DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT
          )
        `);
        console.log('Created gold_history table with correct schema');
      } else {
        // Check if gold_amount column exists
        const hasGoldAmountColumn = await this.columnExists('gold_history', 'gold_amount');
        
        if (!hasGoldAmountColumn) {
          // Try to identify the correct column name
          const columns = await this.getTableColumns('gold_history');
          console.log('Existing columns in gold_history:', columns);
          
          // Look for likely column names for gold amount
          const possibleAmountColumns = columns.filter(col => 
            ['amount', 'gold', 'gold_amount', 'value', 'quantity'].includes(col.toLowerCase())
          );
          
          if (possibleAmountColumns.length > 0) {
            // Use the first matching column
            this.amountColumnName = possibleAmountColumns[0];
            console.log(`Using existing column for amount: ${this.amountColumnName}`);
          } else {
            // Add the gold_amount column if it doesn't exist
            await dbManager.run('ALTER TABLE gold_history ADD COLUMN gold_amount INT NOT NULL DEFAULT 0');
            console.log('Added missing gold_amount column to gold_history table');
          }
        }
        
        // Check if change_amount column exists
        const hasChangeAmountColumn = await this.columnExists('gold_history', 'change_amount');
        if (!hasChangeAmountColumn) {
          // Add change_amount column
          await dbManager.run('ALTER TABLE gold_history ADD COLUMN change_amount INT DEFAULT 0');
          console.log('Added missing change_amount column to gold_history table');
          
          // Calculate change amounts for existing records
          await this.calculateChangeAmounts();
        }
        
        // Check if notes column exists
        const hasNotesColumn = await this.columnExists('gold_history', 'notes');
        if (!hasNotesColumn) {
          // Add notes column
          await dbManager.run('ALTER TABLE gold_history ADD COLUMN notes TEXT');
          console.log('Added missing notes column to gold_history table');
        }
      }
      
      // Migrate data if needed
      await this.migrateAmountColumn();
      
      console.log('Gold model initialized');
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing gold model:', error);
      throw error;
    }
  }
  
  // Migrate data from amount column to gold_amount column
  async migrateAmountColumn() {
    try {
      // Check if both columns exist
      const hasAmountColumn = await this.columnExists('gold_history', 'amount');
      const hasGoldAmountColumn = await this.columnExists('gold_history', 'gold_amount');
      
      if (hasAmountColumn && hasGoldAmountColumn) {
        console.log('Migrating data from amount column to gold_amount column...');
        
        // Copy data from amount to gold_amount
        await dbManager.run(`
          UPDATE gold_history 
          SET gold_amount = amount 
          WHERE gold_amount = 0 OR gold_amount IS NULL
        `);
        
        console.log('Migration complete');
      }
    } catch (error) {
      console.error('Error migrating amount column:', error);
    }
  }
  
  // Calculate change amounts for existing records
  async calculateChangeAmounts() {
    try {
      // Get all users with gold history
      const users = await dbManager.query(
        `SELECT DISTINCT discord_id FROM gold_history`
      );
      
      for (const user of users) {
        const discordId = user.discord_id;
        
        // Get all gold history for user, ordered by timestamp
        const history = await dbManager.query(
          `SELECT id, ${this.amountColumnName} as gold_amount, timestamp FROM gold_history 
           WHERE discord_id = ? ORDER BY timestamp ASC`,
          [discordId]
        );
        
        let previousAmount = 0;
        
        // Calculate and update change amounts
        for (const entry of history) {
          const changeAmount = entry.gold_amount - previousAmount;
          await dbManager.run(
            `UPDATE gold_history SET change_amount = ? WHERE id = ?`,
            [changeAmount, entry.id]
          );
          previousAmount = entry.gold_amount;
        }
      }
      
      console.log('Change amounts calculated for existing records');
    } catch (error) {
      console.error('Error calculating change amounts:', error);
    }
  }
  
  // Check if a table exists
  async tableExists(tableName) {
    try {
      const result = await dbManager.get(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
        [process.env.DB_NAME || 'sotc', tableName]
      );
      return !!result;
    } catch (error) {
      console.error('Error checking if table exists:', error);
      return false;
    }
  }
  
  // Check if a column exists in a table
  async columnExists(tableName, columnName) {
    try {
      const result = await dbManager.get(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
        [process.env.DB_NAME || 'sotc', tableName, columnName]
      );
      return !!result;
    } catch (error) {
      console.error('Error checking if column exists:', error);
      return false;
    }
  }
  
  // Get all columns in a table
  async getTableColumns(tableName) {
    try {
      const results = await dbManager.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
        [process.env.DB_NAME || 'sotc', tableName]
      );
      return results.map(row => row.column_name || row.COLUMN_NAME);
    } catch (error) {
      console.error('Error getting table columns:', error);
      return [];
    }
  }
  
  // Update a user's gold
  async updateGold(discordId, amount, notes = '') {
    await this.init();
    
    try {
      // Get previous gold amount
      const previousGold = await this.getCurrentGold(discordId);
      
      // Calculate change amount
      const changeAmount = amount - previousGold;
      
      // Check if notes column exists
      const hasNotesColumn = await this.columnExists('gold_history', 'notes');
      
      // Add to gold history
      if (hasNotesColumn) {
        await dbManager.run(
          `INSERT INTO gold_history (discord_id, gold_amount, change_amount, notes) VALUES (?, ?, ?, ?)`,
          [discordId, amount, changeAmount, notes]
        );
      } else {
        await dbManager.run(
          `INSERT INTO gold_history (discord_id, gold_amount, change_amount) VALUES (?, ?, ?)`,
          [discordId, amount, changeAmount]
        );
      }
      
      console.log(`Updated gold for user ${discordId}: ${previousGold} -> ${amount} (${changeAmount})`);
      return amount;
    } catch (error) {
      console.error('Error updating gold:', error);
      throw error;
    }
  }
  
  // Get a user's current gold
  async getCurrentGold(discordId) {
    await this.init();
    
    try {
      console.log(`Getting current gold for user ${discordId}`);
      
      // Get the most recent gold entry
      const result = await dbManager.get(
        `SELECT gold_amount FROM gold_history WHERE discord_id = ? ORDER BY timestamp DESC LIMIT 1`,
        [discordId]
      );
      
      console.log('Current gold result:', result);
      
      return result ? result.gold_amount : 0;
    } catch (error) {
      console.error('Error getting current gold:', error);
      // Return 0 as a fallback instead of throwing an error
      return 0;
    }
  }
  
  // Get a user's gold history
  async getGoldHistory(discordId, limit = 10) {
    await this.init();
    
    try {
      console.log(`Getting gold history for user ${discordId} with limit ${limit}`);
      
      // Check if notes column exists
      const hasNotesColumn = await this.columnExists('gold_history', 'notes');
      
      // Build query based on available columns
      let query = `SELECT id, discord_id, gold_amount, change_amount, timestamp`;
      if (hasNotesColumn) {
        query += `, notes`;
      }
      query += ` FROM gold_history WHERE discord_id = ? ORDER BY timestamp DESC LIMIT ?`;
      
      // Execute query
      const history = await dbManager.query(query, [discordId, limit]);
      
      console.log(`Found ${history.length} gold history entries`);
      
      // Log the first entry for debugging
      if (history.length > 0) {
        console.log('First history entry:', JSON.stringify(history[0]));
      }
      
      return history;
    } catch (error) {
      console.error('Error getting gold history:', error);
      console.error(error.stack);
      return []; // Return empty array instead of throwing
    }
  }
  
  // Get leaderboard by current gold
  async getLeaderboard(limit = 10) {
    await this.init();
    
    try {
      // This query gets the latest gold amount for each user
      const leaderboard = await dbManager.query(`
        SELECT gh.discord_id, gh.gold_amount as current_gold, gh.timestamp, u.username
        FROM gold_history gh
        JOIN (
          SELECT discord_id, MAX(timestamp) as max_timestamp
          FROM gold_history
          GROUP BY discord_id
        ) latest ON gh.discord_id = latest.discord_id AND gh.timestamp = latest.max_timestamp
        LEFT JOIN users u ON gh.discord_id = u.discord_id
        ORDER BY gh.gold_amount DESC
        LIMIT ?
      `, [limit]);
      
      return leaderboard;
    } catch (error) {
      console.error('Error getting gold leaderboard:', error);
      return []; // Return empty array instead of throwing
    }
  }
  
  // Diagnostic function to check database structure
  async diagnoseGoldHistory(discordId) {
    try {
      console.log(`Diagnosing gold history for user ${discordId}`);
      
      // Check if gold_history table exists
      const tableCheck = await dbManager.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = ? AND table_name = 'gold_history'
      `, [process.env.DB_NAME || 'sotc']);
      
      console.log('Table check result:', tableCheck);
      
      if (!tableCheck || tableCheck.length === 0) {
        console.error('gold_history table does not exist');
        return { error: 'Table does not exist' };
      }
      
      // Check table structure
      const columns = await dbManager.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = 'gold_history'
      `, [process.env.DB_NAME || 'sotc']);
      
      console.log('Table columns:', columns);
      
      // Try a direct query to see what's in the table
      const rawData = await dbManager.query(`
        SELECT * FROM gold_history 
        WHERE discord_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [discordId]);
      
      console.log('Raw data sample:', rawData);
      
      return {
        tableExists: true,
        columns: columns,
        sampleData: rawData
      };
    } catch (error) {
      console.error('Error diagnosing gold history:', error);
      return { error: error.message };
    }
  }
}

module.exports = new GoldModel();
