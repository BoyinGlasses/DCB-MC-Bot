import util from 'minecraft-server-util';
import { config } from './config.js';

/**
 * Server state enum
 */
export const ServerState = {
  UNKNOWN: 'unknown',
  ONLINE: 'online',
  OFFLINE: 'offline',
};

/**
 * ServerChecker class - handles polling and state management
 */
export class ServerChecker {
  constructor() {
    // State: null on first run (no notification), then true/false
    this.previousState = null;
    this.lastOnlineTime = null;
    this.lastCheckTime = null;
    this.lastServerInfo = null;
    this.isRunning = false;
  }

  /**
   * Check server status and get info
   * @returns {Promise<{online: boolean, info: Object|null}>}
   */
  async checkServer() {
    try {
      const info = await util.status(config.minecraft.host, config.minecraft.port, {
        timeout: config.polling.timeoutMs,
      });
      
      this.lastCheckTime = new Date();
      this.lastServerInfo = info;
      
      return { online: true, info };
    } catch (error) {
      this.lastCheckTime = new Date();
      this.lastServerInfo = null;
      
      return { online: false, info: null };
    }
  }

  /**
   * Determine state change and whether to notify
   * @param {boolean} isOnline - Current online status
   * @returns {{shouldNotify: boolean, isStateChange: boolean, newState: string}}
   */
  evaluateState(isOnline) {
    const currentState = isOnline ? ServerState.ONLINE : ServerState.OFFLINE;
    
    // First run - just set state, don't notify
    if (this.previousState === null) {
      return {
        shouldNotify: false,
        isStateChange: false,
        newState: currentState,
      };
    }

    const wasOnline = this.previousState === ServerState.ONLINE;
    
    // Check if state changed
    if (isOnline !== wasOnline) {
      // State changed!
      if (isOnline) {
        // Server just came online
        this.lastOnlineTime = new Date();
      }
      
      return {
        shouldNotify: true,
        isStateChange: true,
        newState: currentState,
      };
    }

    // No state change
    return {
      shouldNotify: false,
      isStateChange: false,
      newState: currentState,
    };
  }

  /**
   * Update previous state
   * @param {string} newState - New state
   */
  updateState(newState) {
    this.previousState = newState;
  }

  /**
   * Get current uptime in milliseconds
   * @returns {number} Uptime in ms, or 0 if offline
   */
  getUptime() {
    if (!this.lastOnlineTime || !this.lastServerInfo) {
      return 0;
    }
    return Date.now() - this.lastOnlineTime.getTime();
  }

  /**
   * Get timestamp of last online transition
   * @returns {Date|null}
   */
  getLastOnlineTime() {
    return this.lastOnlineTime;
  }

  /**
   * Get last server info
   * @returns {Object|null}
   */
  getLastServerInfo() {
    return this.lastServerInfo;
  }

  /**
   * Get last check time
   * @returns {Date|null}
   */
  getLastCheckTime() {
    return this.lastCheckTime;
  }

  /**
   * Get current state
   * @returns {string|null}
   */
  getCurrentState() {
    return this.previousState;
  }

  /**
   * Calculate uptime based on online time from server info (if available)
   * Some servers report time-related info
   * @returns {number} Estimated uptime in ms
   */
  calculateUptimeFromInfo() {
    if (!this.lastOnlineTime) return 0;
    
    const elapsed = Date.now() - this.lastOnlineTime.getTime();
    
    // Cap at reasonable maximum (7 days)
    return Math.min(elapsed, 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Reset checker state
   */
  reset() {
    this.previousState = null;
    this.lastOnlineTime = null;
    this.lastCheckTime = null;
    this.lastServerInfo = null;
  }
}

// Export singleton instance
export const serverChecker = new ServerChecker();
