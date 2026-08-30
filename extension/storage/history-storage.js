import { StorageManager, STORAGE_KEYS } from './storage-manager.js';

const MAX_HISTORY_ITEMS = 100;

export class HistoryStorage {
  static async getAll(limit = MAX_HISTORY_ITEMS) {
    const history = await StorageManager.get(STORAGE_KEYS.HISTORY, []);
    const sorted = Array.isArray(history) 
      ? history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      : [];
    return sorted.slice(0, limit);
  }

  static async addEntry({
    siteId = null,
    url,
    type,
    message,
    httpStatus = null,
    responseTimeMs = null,
    previousStatus = null,
    newStatus = null,
    riskLevel = null,
    riskDetails = []
  }) {
    const history = await StorageManager.get(STORAGE_KEYS.HISTORY, []);
    
    const newEntry = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      siteId,
      url,
      timestamp: new Date().toISOString(),
      type,
      message,
      httpStatus,
      responseTimeMs,
      previousStatus,
      newStatus,
      riskLevel,
      riskDetails
    };

    const updated = [newEntry, ...(Array.isArray(history) ? history : [])].slice(0, MAX_HISTORY_ITEMS);
    await StorageManager.set(STORAGE_KEYS.HISTORY, updated);
    return newEntry;
  }

  static async clear() {
    await StorageManager.set(STORAGE_KEYS.HISTORY, []);
  }

  static async getBySiteId(siteId) {
    const history = await this.getAll(MAX_HISTORY_ITEMS);
    return history.filter(item => item.siteId === siteId);
  }
}
