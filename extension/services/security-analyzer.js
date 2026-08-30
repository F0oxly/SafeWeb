import { SUSPICIOUS_TLDS, PHISHING_KEYWORDS, TRUSTED_DOMAINS } from '../rules/phishing-rules.js';
import { RISK_WEIGHTS, getRiskClassification } from '../rules/url-heuristics.js';

export class SecurityAnalyzer {
  static SUSPICIOUS_TLDS = SUSPICIOUS_TLDS;
  static PHISHING_KEYWORDS = PHISHING_KEYWORDS;
  static TRUSTED_DOMAINS = TRUSTED_DOMAINS;

  static validateUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') {
      return { valid: false, error: 'URL não pode ser vazia.' };
    }

    let urlToParse = inputUrl.trim();
    if (!/^https?:\/\//i.test(urlToParse)) {
      urlToParse = 'https://' + urlToParse;
    }

    try {
      const parsed = new URL(urlToParse);
      
      if (!parsed.hostname || parsed.hostname.length < 3) {
        return { valid: false, error: 'Domínio ou hostname inválido.' };
      }

      const hostnamePattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$|^localhost$|^(\d{1,3}\.){3}\d{1,3}$/;
      if (!hostnamePattern.test(parsed.hostname) && !parsed.hostname.startsWith('xn--')) {
        return { valid: false, error: 'Formato de domínio não reconhecido.' };
      }

      return { valid: true, urlObj: parsed, cleanUrl: parsed.origin + (parsed.pathname !== '/' ? parsed.pathname : '') };
    } catch {
      return { valid: false, error: 'A URL informada possui formato inválido.' };
    }
  }

  static calculateEntropy(str) {
    if (!str) return 0;
    const len = str.length;
    const frequencies = {};

    for (let i = 0; i < len; i++) {
      const char = str[i];
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    for (const char in frequencies) {
      const p = frequencies[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  static analyze(targetUrl) {
    const validation = this.validateUrl(targetUrl);
    if (!validation.valid || !validation.urlObj) {
      return {
        level: 'high',
        label: 'Possível ameaça',
        score: 90,
        reasons: ['URL com estrutura malformada ou inválida.'],
        details: { flags: ['invalid_format'] }
      };
    }

    const url = validation.urlObj;
    const hostname = url.hostname.toLowerCase();
    const fullHref = url.href.toLowerCase();

    let score = 0;
    const reasons = [];
    const flags = [];

    const isHttps = url.protocol === 'https:';
    if (!isHttps && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      score += RISK_WEIGHTS.NO_HTTPS;
      flags.push('no_https');
      reasons.push('Conexão não criptografada (HTTP). Dados trafegam em texto claro.');
    }

    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIpAddress && hostname !== '127.0.0.1') {
      score += RISK_WEIGHTS.IP_HOSTNAME;
      flags.push('ip_hostname');
      reasons.push('Uso de endereço IP direto no lugar de um nome de domínio registrado.');
    }

    const isPunycode = hostname.startsWith('xn--') || hostname.includes('.xn--');
    if (isPunycode) {
      score += RISK_WEIGHTS.PUNYCODE_DOMAIN;
      flags.push('punycode_domain');
      reasons.push('Domínio utiliza codificação Punycode (IDN), comumente associado a ataques de homografia (imitação de caracteres).');
    }

    const matchedTld = this.SUSPICIOUS_TLDS.find(tld => hostname.endsWith(tld));
    if (matchedTld) {
      score += RISK_WEIGHTS.SUSPICIOUS_TLD;
      flags.push('suspicious_tld');
      reasons.push(`Uso de extensão de domínio comumente explorada para abusos (${matchedTld}).`);
    }

    const parts = hostname.split('.');
    const subdomainCount = Math.max(0, parts.length - 2);
    if (subdomainCount >= 3) {
      score += RISK_WEIGHTS.EXCESSIVE_SUBDOMAINS;
      flags.push('excessive_subdomains');
      reasons.push(`Estrutura profunda de subdomínios detectada (${subdomainCount} níveis).`);
    }

    const foundKeywords = this.PHISHING_KEYWORDS.filter(kw => fullHref.includes(kw));
    if (foundKeywords.length > 0 && !this.isKnownTrustedDomain(hostname)) {
      score += foundKeywords.length * RISK_WEIGHTS.PHISHING_KEYWORD;
      flags.push('phishing_keywords');
      reasons.push(`Presença de termos sensíveis (${foundKeywords.slice(0, 3).join(', ')}) em domínio não reconhecido.`);
    }

    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      score += RISK_WEIGHTS.EXCESSIVE_HYPHENS;
      flags.push('excessive_hyphens');
      reasons.push(`Hostname contém múltiplos hífens (${hyphenCount}), comum em domínios de engenharia social.`);
    }

    const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    const entropy = this.calculateEntropy(sld);
    if (sld.length > 10 && entropy > 3.8) {
      score += RISK_WEIGHTS.HIGH_ENTROPY;
      flags.push('high_entropy');
      reasons.push('Nome do domínio possui alta entropia aleatória (possível geração algorítmica).');
    }

    if (url.port && !['80', '443', '3000', '8080'].includes(url.port)) {
      score += RISK_WEIGHTS.NON_STANDARD_PORT;
      flags.push('non_standard_port');
      reasons.push(`Conexão utilizando porta não convencional (:${url.port}).`);
    }

    const classification = getRiskClassification(score);
    if (classification.level === 'low' && reasons.length === 0) {
      reasons.push('Estrutura de URL padrão com protocolo seguro e sem indicadores suspeitos conhecidos.');
    }

    return {
      level: classification.level,
      label: classification.label,
      score: Math.min(score, 100),
      reasons,
      details: {
        protocol: url.protocol,
        isHttps,
        isIpAddress,
        isPunycode,
        subdomainCount,
        entropy: parseFloat(entropy.toFixed(2)),
        flags
      }
    };
  }

  static isKnownTrustedDomain(hostname) {
    return this.TRUSTED_DOMAINS.some(t => hostname === t || hostname.endsWith('.' + t));
  }
}
