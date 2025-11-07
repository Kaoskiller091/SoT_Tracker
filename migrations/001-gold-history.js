// migrations/001-gold-history.js
const logger = require('../logger');

module.exports = {
  version: '0.1.0',
  description: 'Ensure gold_history table structure',
  
  async apply(connection) {
    try {
      // In a transaction, we need to use connection.query instead of db.run
      logger.info('Creating gold_history table if not exists');
      
      // Create gold_history table if it doesn't exist
      await connection.query(`
        CREATE TABLE IF NOT EXISTS gold_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          discord_id VARCHAR(20) NOT NULL,
          gold_amount INT NOT NULL,
          change_amount INT DEFAULT 0,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
        )
      `);
      
      // Check if notes column exists
      const [notesColumnResult] = await connection.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'gold_history' 
        AND column_name = 'notes'
      `);
      
      if (notesColumnResult.length === 0) {
        logger.info('Adding notes column to gold_history table');
        await connection.query('ALTER TABLE gold_history ADD COLUMN notes TEXT');
      }
      
      // Check if change_amount column exists
      const [changeAmountColumnResult] = await connection.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'gold_history' 
        AND column_name = 'change_amount'
      `);
      
      if (changeAmountColumnResult.length === 0) {
        logger.info('Adding change_amount column to gold_history table');
        await connection.query('ALTER TABLE gold_history ADD COLUMN change_amount INT DEFAULT 0');
        
        // Calculate change amounts
        await this.calculateChangeAmounts(connection);
      }
      
      return true;
    } catch (error) {
      logger.error('Error applying gold history migration:', error);
      throw error;
    }
  },
  
  async calculateChangeAmounts(connection) {
    try {
      // Get all users with gold history
      const [users] = await connection.query(
        `SELECT DISTINCT discord_id FROM gold_history`
      );
      
      for (const user of users) {
        const discordId = user.discord_id;
        
        // Get all gold history for user, ordered by timestamp
        const [history] = await connection.query(
          `SELECT id, gold_amount, timestamp FROM gold_history 
           WHERE discord_id = ? ORDER BY timestamp ASC`,
          [discordId]
        );
        
        let previousAmount = 0;
        
        // Calculate and update change amounts
        for (const entry of history) {
          const changeAmount = entry.gold_amount - previousAmount;
          await connection.query(
            `UPDATE gold_history SET change_amount = ? WHERE id = ?`,
            [changeAmount, entry.id]
          );
          previousAmount = entry.gold_amount;
        }
      }
      
      logger.info('Change amounts calculated for existing records');
    } catch (error) {
      logger.error('Error calculating change amounts:', error);
      throw error;
    }
  }
};
