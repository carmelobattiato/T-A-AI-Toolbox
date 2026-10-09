# T&A AI Toolbox - Architettura Dual-Container e Deployment

Questa guida descrive come eseguire **T&A AI Toolbox** come applicazione distribuita separata in **due container Docker indipendenti**:
1. **Container 1 (Frontend)**: Nginx ultra-leggero che serve la webapp React e funge da reverse proxy verso il backend.
2. **Container 2 (Backend + Database)**: API Express Node.js con storage persistente su file volume (`/app/data/db.json`, `/app/data/log.json` e `/app/data/settings.json`).

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

Tutte le modifiche apportate alla mappa (nuovi tool, nuove fasi, idee, esigenze, allegati, modifiche e cancellazioni) e la configurazione AI custom vengono salvate nei file:
```
./data/db.json        (fasi, tool, WiP, esigenze, allegati, tile della dashboard)
./data/log.json       (audit log delle modifiche, ultime 500 voci)
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

---

## 6. Deploy su Kubernetes

Template in [`k8s/manifests.template.yaml`](k8s/manifests.template.yaml): namespace dedicato, PVC per `db.json`/`settings.json`, Deployment + Service `backend` e `frontend`, PodDisruptionBudget, NetworkPolicy. Il manifest reale si genera sostituendo i segnaposto (istruzioni ed esempio `sed` nell'intestazione del template) e **non va committato**: `k8s/manifests.yaml` è in `.gitignore`.

```bash
REG=registry.example.com/my-team
docker build -t $REG/taai-toolbox-backend:1.0.0  -f Dockerfile.backend .
docker build -t $REG/taai-toolbox-frontend:1.0.0 -f Dockerfile.frontend .
docker push $REG/taai-toolbox-backend:1.0.0
docker push $REG/taai-toolbox-frontend:1.0.0

# genera k8s/manifests.yaml dal template (vedi intestazione), poi:
kubectl apply -f k8s/manifests.yaml
```

**Reverse proxy.** L'applicazione non ha autenticazione propria e va esposta solo dietro un reverse proxy che:

* autentichi ogni richiesta (SSO, OIDC, JWT…);
* imposti l'header `x-forwarded-user` con l'identità dell'utente (autore nell'audit log e owner di default degli elementi creati da chat) e rimuova quello eventualmente inviato dal client;
* inoltri al Service `frontend` (porta 80) con timeout di almeno 90 s, perché le risposte della chat attendono l'LLM.

La NetworkPolicy `frontend-from-ingress` ammette traffico verso il frontend solo dai pod del reverse proxy (segnaposto `<INGRESS_NAMESPACE>` e `<INGRESS_APP_NAME>`); `backend-from-frontend` ammette verso il backend solo il frontend.

**Configurazione LLM.** Dopo il primo avvio, da **Settings AI**: provider `OpenAI Compatible` con base URL, modello e API key di un endpoint compatibile (OpenAI, LiteLLM, vLLM, Ollama…). Se l'endpoint gira nello stesso cluster conviene usare l'indirizzo interno del suo Service (`http://<service>.<namespace>.svc.cluster.local:<porta>`). In alternativa, `GEMINI_API_KEY` nel Deployment backend per usare Gemini nativo.

Vincoli:

* **Backend a una sola replica** (`strategy: Recreate`): i dati vivono in memoria e vengono riscritti su `db.json` a ogni modifica. Due repliche divergerebbero e si sovrascriverebbero il file. Ogni rilascio del backend comporta qualche decina di secondi di API non disponibili.
* **Seed iniziale**: `data/db.json`, `data/log.json` e `data/settings.json` non sono versionati (`.gitignore`) né inclusi nell'immagine (`.dockerignore`). Al primo avvio il backend genera `db.json` (8 fasi e 12 elementi di esempio), `log.json` e `settings.json` di default, senza chiavi. Un vecchio `db.json` che contiene ancora gli audit log li passa a `log.json` al primo avvio. L'initContainer `seed-data` copia un eventuale `db.json` dell'immagine sul volume solo se `db.json` non esiste.
* **PodDisruptionBudget**: `minAvailable: 1` sul backend evita che il cluster autoscaler lo sposti per consolidare i nodi; il frontend ha 2 repliche e `maxUnavailable: 1`.
* **Assistente con provider OpenAI-compatibile**: usa le stesse funzioni del ramo Gemini (ricerca, creazione di tool/idee/esigenze/fasi, modifica, eliminazione) in formato `tools` OpenAI. Modifiche ed eliminazioni passano sempre dalla card di conferma: il modello non può confermare al posto dell'utente.
