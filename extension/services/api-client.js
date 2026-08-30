import { StorageManager } from '../storage/storage-manager.js';

export class ApiClient {
  static async getBaseUrl() {
    const config = await StorageManager.getConfig();
    return config.backendUrl || 'http://localhost:3000';
  }

  static async isBackendAvailable() {
    try {
      const baseUrl = await this.getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async checkSite(url) {
    try {
      const baseUrl = await this.getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${baseUrl}/api/sites/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Backend retornou código HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      return null;
    }
  }

  static async syncSites(sites) {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/sites/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites })
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
