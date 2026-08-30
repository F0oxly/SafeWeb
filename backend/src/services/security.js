export class SecurityService {
  static async checkGoogleSafeBrowsing(targetUrl) {
    const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;

    if (!apiKey) {
      return {
        configured: false,
        status: 'skipped',
        message: 'Google Safe Browsing API Key não configurada no .env'
      };
    }

    try {
      const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
      const payload = {
        client: {
          clientId: 'safeweb-academic',
          clientVersion: '1.0.0'
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: targetUrl }]
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Google API retornou status ${response.status}`);
      }

      const data = await response.json();
      const hasThreat = data.matches && data.matches.length > 0;

      return {
        configured: true,
        checked: true,
        hasThreat,
        matches: data.matches || []
      };
    } catch (err) {
      return {
        configured: true,
        checked: false,
        error: err.message
      };
    }
  }

  static async analyzeUrl(targetUrl) {
    const safeBrowsingResult = await this.checkGoogleSafeBrowsing(targetUrl);

    let level = 'low';
    let label = 'Nenhum risco conhecido';
    const reasons = [];

    if (safeBrowsingResult.configured && safeBrowsingResult.hasThreat) {
      level = 'high';
      label = 'Possível ameaça';
      reasons.push('Detectado no banco de ameaças do Google Safe Browsing.');
    }

    return {
      url: targetUrl,
      level,
      label,
      reasons,
      providers: {
        googleSafeBrowsing: safeBrowsingResult
      },
      analyzedAt: new Date().toISOString()
    };
  }
}
