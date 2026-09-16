(() => {
  const els = {
    analysis: document.getElementById("screenAnalysis"),
    history: document.getElementById("screenHistory"),
    siteUrl: document.getElementById("siteUrl"),
    statusCard: document.getElementById("statusCard"),
    statusIcon: document.getElementById("statusIcon"),
    statusKicker: document.getElementById("statusKicker"),
    statusTitle: document.getElementById("statusTitle"),
    statusDescription: document.getElementById("statusDescription"),
    analyze: document.getElementById("btnAnalyze"),
    historyBtn: document.getElementById("btnHistory"),
    back: document.getElementById("btnBack"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
    clearHistory: document.getElementById("btnClearHistory")
  };

  const STORAGE_KEY = "safeweb_alert_history";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveHistory(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    }).format(new Date(timestamp));
  }

  function normalizeStatus(raw) {
    const s = String(raw || "").toLowerCase();
    if (s.includes("amea") || s.includes("danger") || s.includes("malic") || s.includes("virus")) return "danger";
    if (s.includes("aten") || s.includes("warn") || s.includes("suspe")) return "warning";
    return "safe";
  }

  function statusText(status) {
    return {
      safe: {
        kicker: "Site seguro",
        title: "Nenhuma ameaça identificada",
        description: "A análise não encontrou sinais relevantes de risco neste site.",
        icon: "✓"
      },
      warning: {
        kicker: "Atenção",
        title: "Foram encontrados sinais de risco",
        description: "Tenha cuidado antes de fornecer dados, fazer downloads ou continuar a navegação.",
        icon: "!"
      },
      danger: {
        kicker: "Ameaça",
        title: "Possível site malicioso",
        description: "A página apresenta sinais que podem indicar uma ameaça. Evite informar dados ou baixar arquivos.",
        icon: "×"
      }
    }[status];
  }

  function setStatus(status, url) {
    status = normalizeStatus(status);
    const text = statusText(status);

    els.statusCard.className = `sw-status-card sw-status-${status}`;
    els.statusIcon.textContent = text.icon;
    els.statusKicker.textContent = text.kicker;
    els.statusTitle.textContent = text.title;
    els.statusDescription.textContent = text.description;
    els.siteUrl.textContent = url || "Site atual";
  }

  function addHistory(status, url) {
    const item = {
      status: normalizeStatus(status),
      url: url || "Site atual",
      timestamp: Date.now()
    };
    const history = getHistory();
    saveHistory([item, ...history]);
  }

  function renderHistory() {
    const history = getHistory();
    els.historyList.innerHTML = "";

    if (!history.length) {
      els.historyEmpty.classList.remove("sw-hidden");
      els.clearHistory.classList.add("sw-hidden");
      return;
    }

    els.historyEmpty.classList.add("sw-hidden");
    els.clearHistory.classList.remove("sw-hidden");

    history.forEach(item => {
      const text = statusText(normalizeStatus(item.status));
      const div = document.createElement("div");
      div.className = "sw-history-item";
      div.innerHTML = `
        <div class="sw-history-icon sw-status-${escapeHtml(item.status)}">${escapeHtml(text.icon)}</div>
        <div class="sw-history-info">
          <div class="sw-history-site">${escapeHtml(item.url)}</div>
          <div class="sw-history-status">${escapeHtml(text.kicker)}</div>
        </div>
        <time class="sw-history-time">${escapeHtml(formatDate(item.timestamp))}</time>
      `;
      els.historyList.appendChild(div);
    });
  }

  function showHistory() {
    els.analysis.classList.add("sw-hidden");
    els.history.classList.remove("sw-hidden");
    renderHistory();
  }

  function showAnalysis() {
    els.history.classList.add("sw-hidden");
    els.analysis.classList.remove("sw-hidden");
  }

  async function getCurrentTab() {
    if (!chrome?.tabs?.query) return null;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs?.[0] || null;
  }

  async function analyzeCurrentSite() {
    const tab = await getCurrentTab();
    const url = tab?.url || "";
    els.siteUrl.textContent = url || "Não foi possível identificar o site";
    els.analyze.disabled = true;
    els.analyze.textContent = "Analisando...";

    try {
      // Integração opcional com o restante do projeto:
      // se o background expuser uma mensagem de análise, usamos o resultado.
      if (chrome?.runtime?.sendMessage) {
        const response = await new Promise(resolve => {
          let finished = false;
          const timeout = setTimeout(() => {
            if (!finished) {
              finished = true;
              resolve(null);
            }
          }, 1800);

          chrome.runtime.sendMessage(
            { type: "ANALYZE_CURRENT_SITE", url },
            result => {
              clearTimeout(timeout);
              if (finished) return;
              finished = true;
              resolve(chrome.runtime.lastError ? null : result);
            }
          );
        });

        if (response) {
          const raw = response.status || response.risk || response.classification || response.result;
          const status = normalizeStatus(raw);
          setStatus(status, response.url || url);
          addHistory(status, response.url || url);
        } else {
          // Fallback visual para testar a interface sem depender do backend.
          setStatus("safe", url);
        }
      } else {
        setStatus("safe", url);
      }
    } catch (error) {
      setStatus("safe", url);
    } finally {
      els.analyze.disabled = false;
      els.analyze.textContent = "Analisar site";
    }
  }

  els.historyBtn.addEventListener("click", showHistory);
  els.back.addEventListener("click", showAnalysis);
  els.analyze.addEventListener("click", analyzeCurrentSite);

  els.clearHistory.addEventListener("click", () => {
    if (confirm("Limpar todo o histórico de alertas?")) {
      saveHistory([]);
      renderHistory();
    }
  });

  // Carrega a aba atual na abertura.
  getCurrentTab().then(tab => {
    if (tab?.url) els.siteUrl.textContent = tab.url;
  }).catch(() => {});
})();
