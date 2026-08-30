import { StorageManager, DEFAULT_CONFIG } from '../storage/storage-manager.js';
import { SitesStorage } from '../storage/sites-storage.js';
import { HistoryStorage } from '../storage/history-storage.js';
import { SecurityAnalyzer } from '../services/security-analyzer.js';
import { ApiClient } from '../services/api-client.js';

const ALARM_NAME = 'safeweb_periodic_check';

chrome.runtime.onInstalled.addListener(async () => {
  await setupPeriodicAlarm();
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await setupPeriodicAlarm();
  await updateBadge();
});

async function setupPeriodicAlarm() {
  const config = await StorageManager.getConfig();
  const periodInMinutes = Math.max(1, config.checkIntervalMinutes || 2);

  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: periodInMinutes,
      delayInMinutes: 0.2
    });
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await checkAllSites();
  }
});

export async function checkAllSites() {
  const sites = await SitesStorage.getAll();
  if (sites.length === 0) {
    await updateBadge();
    return [];
  }

  const results = [];
  for (const site of sites) {
    const result = await checkSingleSite(site);
    results.push(result);
  }

  await updateBadge();
  return results;
}

export async function checkSingleSite(site) {
  const startTime = Date.now();
  const previousStatus = site.status;
  let isOnline = false;
  let httpStatus = null;
  let errorMessage = null;

  const backendOnline = await ApiClient.isBackendAvailable();
  if (backendOnline) {
    const backendResult = await ApiClient.checkSite(site.url);
    if (backendResult && backendResult.checked) {
      isOnline = backendResult.status === 'online';
      httpStatus = backendResult.httpStatus;
      errorMessage = backendResult.error || null;
    }
  }

  if (httpStatus === null) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      let response;
      try {
        response = await fetch(site.url, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors',
          cache: 'no-store'
        });
      } catch {
        response = await fetch(site.url, {
          method: 'GET',
          signal: controller.signal,
          mode: 'no-cors',
          cache: 'no-store'
        });
      }

      clearTimeout(timeoutId);
      
      httpStatus = response.status === 0 ? 200 : response.status;
      isOnline = httpStatus >= 200 && httpStatus < 400;
    } catch (err) {
      isOnline = false;
      httpStatus = null;
      errorMessage = err.name === 'AbortError' ? 'Tempo limite esgotado (Timeout)' : 'Falha na conexão de rede';
    }
  }

  const responseTimeMs = Date.now() - startTime;
  const newStatus = isOnline ? 'online' : 'offline';
  const nowIso = new Date().toISOString();

  const updatedSite = await SitesStorage.update(site.id, {
    status: newStatus,
    httpStatus: httpStatus,
    responseTimeMs: responseTimeMs,
    lastChecked: nowIso,
    lastStatusChange: (previousStatus !== newStatus) ? nowIso : site.lastStatusChange
  });

  if (previousStatus && previousStatus !== 'unknown' && previousStatus !== newStatus) {
    if (newStatus === 'offline') {
      await HistoryStorage.addEntry({
        siteId: site.id,
        url: site.url,
        type: 'status_change',
        message: `O site ficou INDISPONÍVEL (${errorMessage || (httpStatus ? 'HTTP ' + httpStatus : 'Sem resposta')}).`,
        httpStatus: httpStatus,
        responseTimeMs: responseTimeMs,
        previousStatus: previousStatus,
        newStatus: newStatus
      });

      await triggerNotification(
        `safeweb_offline_${site.id}_${Date.now()}`,
        '⚠️ Alerta de Indisponibilidade - SafeWeb',
        `O site monitorado "${site.alias || site.hostname}" está fora do ar!`
      );
    } else if (newStatus === 'online') {
      await HistoryStorage.addEntry({
        siteId: site.id,
        url: site.url,
        type: 'recovery',
        message: `O site recuperou a conexão e voltou a responder normalmente (${responseTimeMs}ms).`,
        httpStatus: httpStatus,
        responseTimeMs: responseTimeMs,
        previousStatus: previousStatus,
        newStatus: newStatus
      });

      await triggerNotification(
        `safeweb_online_${site.id}_${Date.now()}`,
        '✅ Site Recuperado - SafeWeb',
        `O site "${site.alias || site.hostname}" voltou a ficar online.`
      );
    }
  }

  return updatedSite;
}

async function triggerNotification(notificationId, title, message) {
  const config = await StorageManager.getConfig();
  if (!config.notificationsEnabled) return;

  try {
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: title,
      message: message,
      priority: 2
    });
  } catch (err) {
    console.error(err);
  }
}

export async function updateBadge() {
  try {
    const sites = await SitesStorage.getAll();
    const offlineCount = sites.filter(s => s.status === 'offline').length;

    if (offlineCount > 0) {
      await chrome.action.setBadgeText({ text: String(offlineCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error(err);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'CHECK_ALL_SITES') {
        const results = await checkAllSites();
        sendResponse({ success: true, sites: results });
      } else if (message.action === 'CHECK_SINGLE_SITE') {
        const site = await SitesStorage.getById(message.siteId);
        if (!site) {
          sendResponse({ success: false, error: 'Site não encontrado' });
          return;
        }
        const updated = await checkSingleSite(site);
        await updateBadge();
        sendResponse({ success: true, site: updated });
      } else if (message.action === 'ANALYZE_URL_SECURITY') {
        const analysis = SecurityAnalyzer.analyze(message.url);
        sendResponse({ success: true, analysis });
      } else if (message.action === 'RELOAD_ALARM') {
        await setupPeriodicAlarm();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Ação não reconhecida' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});
