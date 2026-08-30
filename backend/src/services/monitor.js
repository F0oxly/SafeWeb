export class MonitorService {
  constructor() {
    this.sites = new Map();
    this.history = [];
    this.timer = null;
    this.intervalSeconds = 60;
  }

  start(intervalSeconds = 60) {
    this.intervalSeconds = intervalSeconds;
    if (this.timer) clearInterval(this.timer);

    console.log(`[SafeWeb Backend] Monitor iniciado. Intervalo de checagem: ${intervalSeconds}s.`);
    
    this.timer = setInterval(async () => {
      await this.checkAll();
    }, this.intervalSeconds * 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[SafeWeb Backend] Monitor pausado.');
    }
  }

  async checkUrl(url, timeoutMs = 6000) {
    const startTime = Date.now();
    let isOnline = false;
    let httpStatus = null;
    let errorMessage = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'SafeWeb-Uptime-Bot/1.0 (+https://github.com/safeweb)'
          }
        });
      } catch (e) {
        response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'SafeWeb-Uptime-Bot/1.0 (+https://github.com/safeweb)'
          }
        });
      }

      clearTimeout(timeoutId);
      httpStatus = response.status;
      isOnline = response.status >= 200 && response.status < 400;

      if (!isOnline) {
        errorMessage = `Servidor respondeu com código de erro HTTP ${response.status}`;
      }
    } catch (err) {
      isOnline = false;
      httpStatus = null;
      if (err.name === 'AbortError') {
        errorMessage = `Tempo limite esgotado (${timeoutMs}ms)`;
      } else {
        errorMessage = err.message || 'Falha de conexão / DNS';
      }
    }

    const responseTimeMs = Date.now() - startTime;

    return {
      checked: true,
      url,
      status: isOnline ? 'online' : 'offline',
      httpStatus,
      responseTimeMs,
      error: errorMessage,
      checkedAt: new Date().toISOString()
    };
  }

  async checkAll() {
    const siteList = Array.from(this.sites.values());
    if (siteList.length === 0) return [];

    console.log(`[SafeWeb Backend] Verificando ${siteList.length} site(s)...`);

    for (const site of siteList) {
      const previousStatus = site.status;
      const result = await this.checkUrl(site.url);

      const newStatus = result.status;
      site.status = newStatus;
      site.httpStatus = result.httpStatus;
      site.responseTimeMs = result.responseTimeMs;
      site.lastChecked = result.checkedAt;

      if (previousStatus && previousStatus !== 'unknown' && previousStatus !== newStatus) {
        site.lastStatusChange = result.checkedAt;

        const eventEntry = {
          id: 'be_evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          siteId: site.id,
          url: site.url,
          timestamp: result.checkedAt,
          type: newStatus === 'online' ? 'recovery' : 'status_change',
          message: newStatus === 'online'
            ? `Site recuperado (${result.responseTimeMs}ms, HTTP ${result.httpStatus || 200})`
            : `Site indisponível (${result.error || 'HTTP ' + result.httpStatus})`,
          httpStatus: result.httpStatus,
          responseTimeMs: result.responseTimeMs,
          previousStatus,
          newStatus
        };

        this.addHistory(eventEntry);
        console.warn(`[SafeWeb Alerta] Status de ${site.url} alterado: ${previousStatus} -> ${newStatus}`);
      }

      this.sites.set(site.id, site);
    }

    return Array.from(this.sites.values());
  }

  addHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > 200) {
      this.history.pop();
    }
  }

  syncSites(extensionSites) {
    if (!Array.isArray(extensionSites)) return;
    
    for (const s of extensionSites) {
      if (!s.id || !s.url) continue;
      const existing = this.sites.get(s.id);
      this.sites.set(s.id, {
        ...s,
        ...(existing || {})
      });
    }

    const incomingIds = new Set(extensionSites.map(s => s.id));
    for (const [id] of this.sites) {
      if (!incomingIds.has(id)) {
        this.sites.delete(id);
      }
    }
  }
}

export const monitorService = new MonitorService();
