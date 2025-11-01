// services/config-service.js
const fs = require('fs');
const path = require('path');

const CONFIG_FILE_PATH = path.join(__dirname, '../../.config.json');

class ConfigService {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load config file:', error.message);
    }
    return {};
  }

  saveConfig(newConfig) {
    try {
      // Merge with existing config
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(this.config, null, 2), 'utf8');

      // Update process.env for immediate use
      Object.keys(newConfig).forEach(key => {
        if (newConfig[key]) {
          process.env[key] = newConfig[key];
        }
      });

      // Reinitialize Gemini service if API key was updated
      if (newConfig.GEMINI_API_KEY || newConfig.GEMINI_API_URL) {
        try {
          const geminiService = require('./gemini-service');
          geminiService.reinitialize();
          console.log('✅ Gemini service reinitialized after config update');
        } catch (err) {
          console.warn('⚠️  Could not reinitialize Gemini service:', err.message);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to save config:', error.message);
      throw new Error('Failed to save configuration');
    }
  }

  getConfig() {
    return this.config;
  }

  // Get a masked version of config for frontend display (hide sensitive data)
  getMaskedConfig() {
    const masked = {};
    Object.keys(this.config).forEach(key => {
      if (this.isSensitiveKey(key)) {
        // Show only first 6 and last 4 characters
        const value = this.config[key];
        if (value && value.length > 10) {
          masked[key] = value.substring(0, 6) + '...' + value.substring(value.length - 4);
        } else {
          masked[key] = '***';
        }
      } else {
        masked[key] = this.config[key];
      }
    });
    return masked;
  }

  isSensitiveKey(key) {
    const sensitiveKeys = ['PRIVATE_KEY', 'EVM_PRIVATE_KEY', 'OPERATOR_KEY', 'SECRET', 'API_KEY'];
    return sensitiveKeys.some(sk => key.includes(sk));
  }

  // Initialize process.env with config values on startup
  initializeEnv() {
    Object.keys(this.config).forEach(key => {
      if (!process.env[key] && this.config[key]) {
        process.env[key] = this.config[key];
      }
    });
  }
}

module.exports = new ConfigService();
