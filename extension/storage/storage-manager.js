const STORAGE_KEYS = {
  SITES: 'safeweb_sites',
  HISTORY: 'safeweb_history',
  CONFIG: 'safeweb_config'
};

const DEFAULT_CONFIG = {
  checkIntervalMinutes: 2,
  backendUrl: 'http://localhost:3000',
  notificationsEnabled: true,
  useBackend: true
};

export class StorageManager {
  static async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          resolve(defaultValue);
          return;
        }
        resolve(result[key] !== undefined ? result[key] : defaultValue);
      });
    });
  }

  static async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  static async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  }

  static async getConfig() {
    const config = await this.get(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG, ...config };
  }

  static async setConfig(newConfig) {
    const current = await this.getConfig();
    const merged = { ...current, ...newConfig };
    await this.set(STORAGE_KEYS.CONFIG, merged);
    return merged;
  }
}

export { STORAGE_KEYS, DEFAULT_CONFIG };
