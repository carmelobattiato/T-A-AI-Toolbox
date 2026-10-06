# T&A AI Toolbox - Architettura Dual-Container e Deployment

Questa guida descrive come eseguire **T&A AI Toolbox** come applicazione distribuita separata in **due container Docker indipendenti**:
1. **Container 1 (Frontend)**: Nginx ultra-leggero che serve la webapp React e funge da reverse proxy verso il backend.
2. **Container 2 (Backend + Database)**: API Express Node.js con storage persistente su file volume (`/app/data/db.json` e `/app/data/settings.json`).

---

## 1. Struttura dei Container

```
                    ┌─────────────────────────────────────────┐
                    │               CLIENT WEB                │
                    │         (Browser degli utenti)          │
                    └────────────────────┬────────────────────┘
                                         │ Porta 3000 (o 80)
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │          CONTAINER 1: FRONTEND          │
                    │               (Nginx SPA)               │
                    │  • Serve HTML/JS statici                │
                    │  • Reverse proxy per /api/ ────────┐    │
                    └────────────────────────────────────┼────┘
                                                         │ Porta 5000 interna
                                                         ▼
                    ┌─────────────────────────────────────────┐
                    │       CONTAINER 2: BACKEND + DB         │
                    │          (Node.js / Express)            │
                    │  • API REST: /api/phases, /api/items    │
                    │  • Chatbot Copilot & Tool Execution     │
                    │  • Configurazione OpenAI Custom         │
                    └────────────────────┬────────────────────┘
                                         │ Volume mount
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │       VOLUME PERSISTENTE HOST           │
                    │              (./data)                   │
                    │  • db.json (Tool, Idee, Esigenze, Fasi) │
                    │  • settings.json (Parametri AI Custom)  │
                    └─────────────────────────────────────────┘
```

---

## 2. Avvio Rapido

Rendi eseguibili gli script bash:
```bash
chmod +x start.sh stop.sh build-containers.sh backup-db.sh
```

### Avvio con uno script:
```bash
./start.sh
```

Oppure direttamente con Docker Compose:
```bash
docker compose up -d --build
```

L'applicazione sarà immediatamente raggiungibile a:
* **Frontend Web App**: `http://localhost:3000`
* **Backend API REST**: `http://localhost:5000/api`

---

## 3. Persistenza dei Dati

Tutte le modifiche apportate alla mappa (nuovi tool, nuove fasi, idee, esigenze, allegati, modifiche e cancellazioni) e la configurazione AI custom vengono salvate nel file:
```
./data/db.json
./data/settings.json
```
Grazie al mapping volume `volumes: - ./data:/app/data` in `docker-compose.yml`, i dati **rimangono preservati permanentemente** anche quando i container vengono fermati, ricostruiti o aggiornati con una nuova versione di immagine.

### Backup del database
Per effettuare una copia di backup con timestamp:
```bash
./backup-db.sh
```

---

## 4. Configurazione API OpenAI Custom

Nell'interfaccia, cliccando sul pulsante **Settings AI** nella barra superiore:
* È possibile inserire un endpoint custom compatibile con le API OpenAI:
  * **Base URL**: es. `https://api.openai.com/v1`, oppure endpoint interno di rete (es. `http://localhost:11434/v1` per Ollama, o `https://vllm-proxy.corp/v1`)
  * **Modello**: es. `gpt-4o-mini`, `gpt-4o`, `qwen2.5`, `mistral`, ecc.
  * **API Key**: token / chiave di autenticazione
* È disponibile il pulsante **Testa Connessione** per verificare in tempo reale la latenza e la raggiungibilità prima del salvataggio.
* La configurazione viene salvata persistentemente sul backend in `./data/settings.json`.

---

## 5. Arresto dei Container

```bash
./stop.sh
```
oppure:
```bash
docker compose down
```
