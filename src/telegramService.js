'use strict';

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const PREFIX = 'LIVE-SCORE:';

class TelegramService {
  constructor() {
    this.bot = new TelegramBot(config.telegram.botToken);
  }

  async sendMessage(message, chatId) {
    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });
      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Failed to send Telegram notification:', error.message);
      // Don't throw — Telegram errors should never crash the main process
    }
  }

  async sendLogMessage(message) {
    const formatted = `${PREFIX} ${message}`;
    await this.sendMessage(formatted, config.telegram.logChannelId);
  }

  async sendErrorMessage(message) {
    const formatted = `${PREFIX} ${message}`;
    await this.sendMessage(formatted, config.telegram.logChannelId);
    await this.sendMessage(formatted, config.telegram.errorsChannelId);
  }

  async notifyError(error) {
    const message = `❌ Error Occurred\n${error.message}`;
    await this.sendErrorMessage(message);
  }

  async notifyStartup() {
    await this.sendLogMessage('🟢 Live Score service started');
  }

  async notifyShutdown() {
    await this.sendLogMessage('🔴 Live Score service stopped');
  }
}

module.exports = new TelegramService();
