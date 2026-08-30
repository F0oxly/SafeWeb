# SafeWeb 
> **Projeto Acadêmico:** Extensão para Google Chrome (Manifest V3) & Backend Auxiliar em Node.js  
> **Objetivo:** Segurança proativa durante a navegação web e monitoramento contínuo de disponibilidade de serviços (Uptime).
## Sumário
- [Visão Geral](#-visão-geral)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Níveis de Risco de Segurança](#-níveis-de-risco-de-segurança)
- [Como Instalar e Testar a Extensão](#-como-instalar-e-testar-a-extensão)
- [Como Executar o Backend (Node.js)](#-como-executar-o-backend-nodejs)
- [Segurança & Gestão de Segredos](#-segurança--gestão-de-segredos)
- [APIs do Chrome Utilizadas](#-apis-do-chrome-utilizadas)
- [Licença](#-licença)


## Visão Geral

O **SafeWeb** foi desenvolvido como uma solução híbrida para dois problemas fundamentais da web moderna:
1. **Monitoramento de Disponibilidade:** Acompanha o status de sites cadastrados pelo usuário, detectando quedas de conexão, erros HTTP (4xx, 5xx), timeouts e disparando notificações no sistema operacional.
2. **Análise de Risco de URLs:** Avalia aspectos estruturais de URLs (protocolo HTTP vs HTTPS, ataques homográficos/IDN Punycode, uso de IPs literais, entropia de Shannon e TLDs de alto risco), fornecendo orientações claras sem falsas promessas de "100% de segurança".


## Arquitetura do Sistema

O sistema opera com independência de camadas:
* **Modo Autônomo (Extensão Pura):** Caso o backend não esteja ativo, o Service Worker da extensão utiliza `chrome.alarms` e `fetch` em background para checar os domínios e executar a análise heurística de risco localmente.
* **Modo Estendido (Extensão + Backend):** Com o backend em execução na porta 3000, o monitoramento ganha capacidade de checagem 24/7 (mesmo com o navegador fechado), métricas consolidadas de latência e integração segura com APIs de terceiros.

---

## Níveis de Risco de Segurança

Em conformidade com as boas práticas acadêmicas de segurança da informação, o SafeWeb **não utiliza declarações absolutas como "Site 100% Seguro"**. O sistema adota três classificações fundamentadas:

| Indicador | Significado | Critérios Avaliados |
| :--- | :--- | :--- |
| 🟢 **Nenhum risco conhecido** | Baixa probabilidade de anomalia estrutural | HTTPS válido, domínio padrão, baixa entropia, sem termos maliciosos identificados. |
| 🟡 **Atenção** | Fatores que demandam cautela do usuário | Conexão HTTP sem TLS, subdomínios excessivos, portas incomuns ou termos sensíveis. |
| 🔴 **Possível ameaça** | Múltiplos indicadores críticos de perigo | Ataques de Homografia/Punycode (`xn--`), IP literal, TLDs de alto abuso ou detecção em Threat Lists. |

---

## Como Instalar e Testar a Extensão

1. Abra o navegador **Google Chrome**.
2. Acesse `chrome://extensions` na barra de endereços.
3. No canto superior direito, ative a opção **Modo do desenvolvedor** (*Developer mode*).
4. Clique no botão **Carregar sem compactação** (*Load unpacked*).
5. Selecione a pasta 



## 🔐 Segurança & Gestão de Segredos

* **Extensão (Zero Secrets):** Nenhuma chave de API privada ou segredo é embarcado no código da extensão (`manifest.json` ou arquivos `.js`).
* **Backend:** Todas as credenciais de serviços externos residem exclusivamente no arquivo `.env` do backend, fora do controle de versão.
* **Permissões Mínimas:** O `manifest.json` declara apenas as permissões essenciais (`storage`, `alarms`, `notifications`).

---

## 🧩 APIs do Chrome Utilizadas

* `chrome.storage.local`: Persistência local assíncrona dos dados de monitoramento e histórico.
* `chrome.alarms`: Execução programada e econômica de checagens em segundo plano.
* `chrome.notifications`: Disparo de avisos nativos em caso de indisponibilidade ou recuperação de domínios.
* `chrome.action`: Gerenciamento do popup e badges informativos de alerta no ícone.
* `chrome.runtime`: Comunicação assíncrona entre o Popup e o Service Worker.

---

## 📄 Licença
Projeto desenvolvido para fins acadêmicos e educacionais.
