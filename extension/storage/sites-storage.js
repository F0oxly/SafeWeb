import { StorageManager, STORAGE_KEYS } from './storage-manager.js';

export class SitesStorage {
  static async getAll() {
    const sites = await StorageManager.get(STORAGE_KEYS.SITES, []);
    return Array.isArray(sites) ? sites : [];
  }

  static async getById(id) {
    const sites = await this.getAll();
    return sites.find(site => site.id === id) || null;
  }

  static async getByUrl(url) {
    const sites = await this.getAll();
    const normalized = this.normalizeUrl(url);
    return sites.find(site => this.normalizeUrl(site.url) === normalized) || null;
  }

  static async add(siteData) {
    const sites = await this.getAll();
    const normalizedUrl = this.normalizeUrl(siteData.url);

    const exists = sites.some(s => this.normalizeUrl(s.url) === normalizedUrl);
    if (exists) {
      throw new Error('Este domínio já está cadastrado no monitoramento.');
    }

    const newSite = {
      id: 'site_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      url: normalizedUrl,
      alias: siteData.alias || this.extractHostname(normalizedUrl),
      hostname: this.extractHostname(normalizedUrl),
      status: siteData.status || 'unknown',
      httpStatus: siteData.httpStatus !== undefined ? siteData.httpStatus : null,
      responseTimeMs: siteData.responseTimeMs !== undefined ? siteData.responseTimeMs : null,
      lastChecked: siteData.lastChecked || null,
      lastStatusChange: siteData.lastStatusChange || null,
      riskLevel: siteData.riskLevel || 'low',
      riskLabel: siteData.riskLabel || 'Nenhum risco conhecido',
      riskDetails: siteData.riskDetails || [],
      addedAt: new Date().toISOString()
    };

    sites.push(newSite);
    await StorageManager.set(STORAGE_KEYS.SITES, sites);
    return newSite;
  }

  static async update(id, updates) {
    const sites = await this.getAll();
    const index = sites.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error(`Site com ID ${id} não encontrado.`);
    }

    const updatedSite = { ...sites[index], ...updates };
    sites[index] = updatedSite;

    await StorageManager.set(STORAGE_KEYS.SITES, sites);
    return updatedSite;
  }

  static async remove(id) {
    const sites = await this.getAll();
    const filtered = sites.filter(s => s.id !== id);
    await StorageManager.set(STORAGE_KEYS.SITES, filtered);
    return true;
  }

  static normalizeUrl(urlStr) {
    let clean = urlStr.trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    try {
      const parsed = new URL(clean);
      return parsed.origin + (parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : '');
    } catch {
      return clean;
    }
  }

  static extractHostname(urlStr) {
    try {
      const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return parsed.hostname;
    } catch {
      return urlStr;
    }
  }
}
