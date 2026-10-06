# 🚀 T&A AI Toolbox

<div align="center">

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![AI Providers](https://img.shields.io/badge/AI-Gemini%20%7C%20OpenAI%20Custom-8A2BE2?style=for-the-badge&logo=openai&logoColor=white)

**Mappa interattiva e intelligente per la governance e l'evoluzione dei processi Technology & Architecture (T&A).**  
Visualizzazione grafica end-to-end con fasi a *matitone*, catalogazione di Tool, Idee ed Esigenze operative, relazioni molti-a-molti, modalità focus dinamica e Copilot AI con supporto per API custom OpenAI e Gemini.

[Panoramica](#-panoramica) •
[Architettura](#-architettura-dual-container) •
[Funzionalità](#-funzionalità-principali) •
[Installazione Rapida](#-installazione-e-avvio-rapido) •
[Configurazione AI](#-configurazione-ai) •
[Modello Dati](#-modello-dati) •
[API REST](#-api-rest-endpoints)

---

</div>

```
                      ┌──────────────────────────────────────────────┐
                      │              TOOL & IDEE (Alto)              │
                      │  🔵 Tool Esistenti   🟣 Idee in Valutazione  │
                      └───────────────────────┬──────────────────────┘
                                              │ Connessioni Molti-a-Molti
                                              ▼
 ┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
 │ 01. Assessment ├───►│ 02. Readiness ├───►│ 03. Foundation├───►│  04. Deploy   │
 └───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
                      ▲ FASI SEQUENZIALI DEL PROCESSO A "MATITONE" (Centro)
                      │
                      │ Connessioni Molti-a-Molti
                      └───────────────────────┬──────────────────────┘
                      │            ESIGENZE OPERATIVE (Basso)        │
                      │  🟢 Esigenze e Gap di Automazione Mappati    │
                      └──────────────────────────────────────────────┘
```

---

## 📖 Panoramica

**T&A AI Toolbox** è una piattaforma web collaborativa progettata per risolvere la frammentazione informativa e mappare in modo trasparente l'intero ecosistema di progetti, strumenti e necessità del team Technology & Architecture.

L'applicazione consente a chiunque si colleghi di:
1. **Visualizzare la catena del valore**: Le fasi del processo sono posizionate orizzontalmente come blocchi centrali a *matitone* (chevron) ordinati logicamente.
2. **Catalogare e posizionare gli asset**:
   - **Tool** (sfere blu): Strumenti già operativi, con indicazione dello stato di adozione e del badge *"Da generalizzare"*.
   - **Idee** (sfere viola con bordo tratteggiato): Iniziative e POC in fase di studio o incubazione.
   - **Esigenze** (sfere verdi): Requisiti operativi, problematiche aperte e gap di automazione da colmare.
3. **Mappare relazioni complesse molti-a-molti**: Un singolo Tool o Esigenza può collegarsi contemporaneamente a una o molteplici fasi, evidenziando strumenti trasversali.
4. **Interagire con il Copilot T&A Assistant**: Un assistente AI integrato capace di rispondere sullo stato dei processi, identificare gap, e manipolare attivamente il grafo creando, modificando o eliminando nodi in sicurezza (con card di conferma preventiva interattiva).
5. **Configurare provider AI on-the-fly**: Possibilità di collegare qualsiasi endpoint compatibile OpenAI (es. server interno aziendale, Ollama, vLLM, Azure OpenAI, Groq) oltre a Google Gemini.
6. **Accesso aperto senza attriti**: Nessuna gestione rigida degli account individuali; l'ambiente è condiviso per tutti i collaboratori con salvataggio persistente e concorrente.

---

## 🏛️ Architettura Dual-Container

Il sistema è strutturato come un'architettura a **due container indipendenti**, predisposta sia per l'esecuzione in locale con Docker sia per il rilascio su cluster, server on-premise o cloud:

```
                                ┌─────────────────────────────────────────┐
                                │             BROWSER UTENTI              │
                                │         (Qualsiasi client HTTP)         │
                                └────────────────────┬────────────────────┘
                                                     │ Porta 3000 (Host)
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  CONTAINER 1: FRONTEND (ta-toolbox-frontend)                                           │
│  • Nginx Alpine ultra-leggero e performante                                            │
│  • Serve i file statici React compilati (SPA)                                          │
│  • Reverse-proxy interno: inoltra /api/* al container di Backend                       │
└────────────────────────────────────┬───────────────────────────────────────────────────┘
                                     │ Rete Docker interna (porta 5000)
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  CONTAINER 2: BACKEND + DB (ta-toolbox-backend)                                        │
│  • Server Node.js / Express con runtime TypeScript                                     │
│  • API REST per Fasi, Item, Ricerca, Note e Allegati                                   │
│  • Chatbot Engine: Google Gemini SDK & Client OpenAI HTTP compatibile                  │
│  • Engine di Function Calling per manipolazione diretta del grafo                      │
└────────────────────────────────────┬───────────────────────────────────────────────────┘
                                     │ Volume persistente (./data)
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  STORAGE PERSISTENTE HOST (Cartella ./data)                                            │
│  📁 db.json        -> Database JSON con atomicità ACID e lock di scrittura             │
│  📁 settings.json  -> Configurazione custom AI salvata (Endpoint, Modello, API Key)   │
│  📁 uploads/       -> Repository degli allegati (immagini, screenshot)                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> 💾 **Garanzia di persistenza:** Tutte le modifiche apportate (creazione/modifica di fasi e tool, spostamenti sul canvas, configurazione AI) vengono salvate permanentemente sul volume host `./data/`. Riavviare o aggiornare i container Docker non provocherà alcuna perdita di dati.

---

## ✨ Funzionalità Principali

### 🎨 1. Canvas Grafico ad Alte Prestazioni (`@xyflow/react`)
- **Layout a 3 Corsie Tematiche**:
  - *Corsia Superiore (Y < 200)*: Tool consolidati ed Idee in incubazione.
  - *Corsia Centrale (Y ~ 360)*: Fasi di processo sequenziali a forma di freccia/chevron.
  - *Corsia Inferiore (Y > 500)*: Esigenze operative e punti di miglioramento.
- **Relazioni Molti-a-Molti Visive**: Connessioni curve morbide con indicatori direzionali che collegano ogni elemento a tutte le fasi coperte.
- **Drag & Drop con Auto-Save**: Trascina liberamente qualsiasi nodo per organizzare visivamente l'area di lavoro; le coordinate vengono salvate istantaneamente.
- **Panoramica / MiniMap Interattiva**: Widget minimap integrato nell'angolo inferiore sinistro con pulsante di compressione/espansione per non ostruire il canvas.
- **Controlli Zoom & Reset**: Controlli rapidi di ingrandimento, riduzione e riposizionamento a tutto schermo (`fitView`).

### 🎯 2. Modalità Focus a Cascata
- **Click su una Fase**:
  - La fase selezionata si illumina con un bordo neon e ombra glow (100% opacità).
  - Tutti i Tool, Idee ed Esigenze associati a quella fase rimangono al 100% di opacità.
  - I collegamenti diretti vengono evidenziati al 100%.
  - I collegamenti trasversali verso altre fasi rimangono visibili con trasparenza elegante (25%).
  - Tutte le fasi e gli item non correlati sfumano in secondo piano (15% di opacità).
  - Si apre il drawer laterale con la panoramica dettagliata della fase.
- **Click su un Item (Tool / Idea / Esigenza)**:
  - Il nodo si attiva e accende contemporaneamente tutte le fasi a cui è collegato.
- **Deselezione**: Un click sul canvas o sul pulsante di chiusura ripristina la visuale globale al 100%.

### 🤖 3. Copilot T&A Assistant (AI Multimodale & Function Calling)
- **Doppio Motore AI**:
  - **Google Gemini**: Utilizza il moderno `@google/genai` con modello ultra-rapido `gemini-3.8-flash`.
  - **OpenAI Compatible Endpoint**: Consente di collegare istanze locali (Ollama, vLLM, LM Studio) o cloud (OpenAI, Azure, Groq, Mistral).
- **Function Calling per il Grafo**: L'assistente comprende comandi in linguaggio naturale ed esegue azioni reali:
  - *"Quali fasi copre il tool Document AI?"*
  - *"Ci sono esigenze non coperte da alcun tool?"*
  - *"Aggiungi una nuova fase 'Quality Assurance' dopo Testing"*
  - *"Crea una nuova idea: 'Generatore automatico di diagrammi C4' per la fase Architecture"*
- **Sicurezza e Conferma Preventiva**:
  - Se si richiede una modifica o eliminazione (es. *"Elimina il tool X"* o *"Rinomina Y"*), l'assistente **non esegue l'operazione alla cieca**: genera una card interattiva con il riepilogo dell'azione e due pulsanti fisici: **Conferma Operazione** e **Annulla**.
  - L'utente può confermare sia premendo il pulsante sia rispondendo direttamente in chat (*"sì"*, *"confermo"*, *"annulla"*).
- **Rendering Markdown Completo**: Risposte formattate con elenchi puntati, grassetti, tabelle e blocchi di codice stilizzati con Tailwind.

### ⚙️ 4. Gestione Impostazioni AI Personalizzate
- Pulsante dedicato **Settings AI** nella barra superiore:
  - Selezione rapida del provider: **Google Gemini (Default)** o **OpenAI Custom**.
  - Configurazione campi OpenAI: **Base URL** (es. `http://localhost:11434/v1` o `https://api.openai.com/v1`), **Model** (es. `gpt-4o-mini`, `llama3.1`, `mistral`), e **API Key**.
  - Pulsante **Testa Connessione**: Verifica in tempo reale la latenza di rete e la validità dei parametri prima di salvare.
  - Salvataggio centralizzato nel file persistente `data/settings.json`.

### 👥 5. Accesso Aperto & Collaborativo (Zero Friction)
- Nessuna maschera di login o gestione rigida degli utenti: accesso immediato e libero per tutti i membri del team.
- Badge di identità condiviso **Team T&A** con audit log centralizzato per tracciare le modifiche collaborative.
- Sincronizzazione automatica tra client connessi.

### 🛠️ 6. Drawer Dettagliati e Gestione Elementi
- **Item Drawer**:
  - Modifica completa di Titolo, Sintesi, Descrizione, Owner/Proponente.
  - Selezione multipla delle fasi coperte (relazione molti-a-molti con pillole cliccabili).
  - Toggle rapido *"Da generalizzare"* per identificare tool riusabili.
  - Link rapidi verso Repository GitHub, Service Catalog o Demo live.
  - Campi specifici per Idee (*Problema*, *Requisiti*, *Benefici attesi*) ed Esigenze (*Processo attuale*, *Tool desiderato*, *Outcome*).
  - Gestione **Allegati Multipli**: Caricamento fino a 3 immagini/screenshot da max 5MB con visualizzatore lightbox ingrandito.
  - Pulsante di **Eliminazione Sicura** con modale di conferma per evitare cancellazioni accidentali.
- **Phase Drawer**:
  - Modifica del titolo e della descrizione della fase.
  - Gestione delle attività chiave (aggiunta, rimozione e spunta).
  - Spostamento ordinale della fase (sposta a sinistra/destra).
  - Contatori in tempo reale di Tool, Idee ed Esigenze associati.
  - Pulsante di eliminazione sicura con riallineamento automatico delle fasi rimanenti.

### 🔍 7. Ricerca Istantanea e Filtri
- Ricerca a testo libero con evidenziazione in tempo reale su titoli, descrizioni e owner.
- Filtri a levetta per categoria: **Tool** (Blu), **Idee** (Viola), **Esigenze** (Verdi).
- Filtro specializzato **Solo da generalizzare** per l'attività di razionalizzazione del portafoglio applicativo.

---

## 🚀 Installazione e Avvio Rapido

### Opzione A: Con Docker & Docker Compose (Consigliato per Produzione)

È il metodo più semplice, pulito e isolato: avvia il frontend Nginx e il backend Node.js configurando automaticamente rete e volumi persistenti.

#### 1. Prerequisiti
- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.0+)

#### 2. Avvio con lo script dedicato
Gli script bash sono già inclusi nella radice del progetto:

```bash
# Dai i permessi di esecuzione agli script (se necessario)
chmod +x start.sh stop.sh build-containers.sh backup-db.sh

# Avvia l'applicazione in background
./start.sh
```

Oppure direttamente tramite comando standard Docker:
```bash
docker compose up -d --build
```

#### 3. Accesso all'applicazione
- **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API REST**: [http://localhost:5000/api](http://localhost:5000/api)
- **Salvataggio Dati**: La cartella `./data/` sull'host conterrà `db.json` e `settings.json`.

---

### Opzione B: Sviluppo Locale (Bare-Metal con Node.js)

Se desideri sviluppare ed effettuare modifiche direttamente al codice sorgente:

#### 1. Prerequisiti
- [Node.js](https://nodejs.org/) (versione 20.x o superiore)
- npm (v9 o superiore)

#### 2. Installazione delle dipendenze
```bash
npm install
```

#### 3. Configurazione variabili d'ambiente
```bash
cp .env.example .env
```
*(Opzionale)* Modifica il file `.env` inserendo la tua chiave Google Gemini (`GEMINI_API_KEY`) se intendi utilizzare il modello Gemini nativo. In alternativa, puoi configurare OpenAI direttamente dall'interfaccia grafica.

#### 4. Avvio in modalità Dev
```bash
npm run dev
```

L'applicazione unificata (Express + Vite middlewares HMR) sarà attiva su [http://localhost:3000](http://localhost:3000).

---

## 📜 Script di Gestione Inclusi

| Script | Descrizione |
|---|---|
| `./start.sh` | Avvia l'intero stack dual-container in background tramite Docker Compose, verificando prerequisiti e cartelle di persistenza. |
| `./stop.sh` | Arresta e rimuove ordinatamente i container di frontend e backend. |
| `./build-containers.sh` | Ricostruisce le immagini Docker da zero senza utilizzare la cache (`--no-cache`). |
| `./backup-db.sh` | Crea una copia istantanea di sicurezza del database `data/db.json` con timestamp in formato `data/backups/db-YYYYMMDD-HHMMSS.json`. |

---

## 🔧 Configurazione AI

L'applicazione supporta due modalità di intelligenza artificiale per alimentare il Copilot T&A Assistant:

### 1. Modalità OpenAI Custom (Configurabile da UI)
Accedi alla barra superiore dell'applicazione e clicca su **Settings AI**:
- **Provider**: Seleziona `OpenAI Compatible`.
- **Base URL**:
  - *OpenAI Cloud*: `https://api.openai.com/v1`
  - *Ollama Locale*: `http://localhost:11434/v1` (o indirizzo IP dell'host Docker)
  - *vLLM / LocalAI / LM Studio*: `http://<tuo-ip-o-dns>:8000/v1`
  - *Groq*: `https://api.groq.com/openai/v1`
- **Modello**: Inserisci il nome del modello desiderato (es. `gpt-4o-mini`, `llama3.2`, `qwen2.5-coder`).
- **API Key**: Inserisci la chiave API (o qualsiasi stringa se il server locale non richiede autenticazione).
- Clicca su **Testa Connessione** per verificare la risposta immediata del server e salva.

### 2. Modalità Google Gemini (Default)
È sufficiente impostare la variabile d'ambiente `GEMINI_API_KEY` nel file `.env` o passarla a Docker Compose. L'applicazione utilizzerà automaticamente il modello `gemini-3.8-flash`.

---

## 📂 Struttura del Progetto

```
.
├── Dockerfile.frontend        # Multi-stage build (Vite -> Nginx Alpine) per il frontend
├── Dockerfile.backend         # Immagine Node.js Alpine leggera per il backend API
├── docker-compose.yml         # Orchestrazione dual-container con networking e volumi
├── docker/
│   └── nginx.conf             # Configurazione Nginx con reverse-proxy /api e SPA routing
├── start.sh                   # Script di avvio rapido Docker
├── stop.sh                    # Script di arresto Docker
├── build-containers.sh        # Script per rebuild immagini Docker
├── backup-db.sh               # Script per backup automatico del database
├── DEPLOYMENT.md              # Guida dettagliata al deployment in produzione
├── data/                      # Volume persistente su host
│   ├── db.json                # Database JSON con fasi, tool, idee, esigenze
│   ├── settings.json          # Parametri di configurazione AI custom
│   └── uploads/               # Cartella allegati e screenshot
├── server.ts                  # Server entry point Express (API REST e routing)
├── server/
│   ├── assistant.ts           # Logica conversazionale Copilot, Function Calling e Prompting
│   ├── settingsStore.ts       # Gestore persistente della configurazione AI
│   └── store.ts               # Database layer ACID su filesystem con lock e validazione
├── src/
│   ├── App.tsx                # Layout principale dell'applicazione
│   ├── main.tsx               # Entry point client React
│   ├── types/
│   │   └── index.ts           # Interfacce TypeScript (Phase, Item, Settings, ecc.)
│   └── components/
│       ├── chat/              # Copilot T&A Assistant (chat, markdown, card di conferma)
│       ├── drawers/           # ItemDrawer (dettaglio tool/idee/esigenze) e PhaseDrawer
│       ├── graph/             # Nodi React Flow personalizzati (ToolNode, PhaseNode, ecc.)
│       ├── header/            # Barra superiore, pulsanti Aggiungi, Ricerca e Settings AI
│       └── modals/            # Modali di aggiunta elemento, aggiunta fase e Settings
└── package.json               # Dipendenze e script del progetto
```

---

## 📊 Modello Dati

### Fase di Processo (`Phase`)
```typescript
interface Phase {
  id: string;               // Identificativo univoco (es. "phase-1")
  title: string;            // Nome della fase (es. "Assessment", "Readiness")
  description: string;      // Scopo della fase
  activities: string[];     // Elenco di attività operative previste
  position: number;         // Ordinamento sequenziale (0..N)
  isCore?: boolean;         // Flag per proteggere fasi standard
}
```

### Elemento (`Item`: Tool, Idea, Esigenza)
```typescript
interface Item {
  id: string;               // Identificativo univoco
  type: 'TOOL' | 'IDEA' | 'NEED';
  title: string;            // Nome dell'elemento
  summary: string;          // Breve sintesi visualizzata nel nodo
  description: string;      // Descrizione dettagliata
  phaseIds: string[];       // Array di fasi coperte (relazione molti-a-molti)
  owner: string;            // Responsabile o proponente
  generalizationRequired?: boolean; // Flag "Da generalizzare" per i tool
  githubUrl?: string;       // Link alla repository del tool
  catalogUrl?: string;      // Link alla scheda di catalogo
  demoUrl?: string;         // Link alla demo live
  attachments?: Attachment[]; // Screenshot e file allegati (max 3, max 5MB ciascuno)
  positionX?: number;       // Coordinate X personalizzate su canvas
  positionY?: number;       // Coordinate Y personalizzate su canvas
}
```

---

## 🌐 API REST Endpoints

| Metodo | Endpoint | Descrizione |
|---|---|---|
| `GET` | `/api/health` | Verifica lo stato di salute del backend e dei database |
| `GET` | `/api/phases` | Recupera l'elenco ordinato di tutte le fasi del processo |
| `POST` | `/api/phases` | Crea una nuova fase (con riallineamento sequenziale delle posizioni) |
| `PUT` | `/api/phases/:id` | Modifica titolo, descrizione o attività di una fase |
| `DELETE` | `/api/phases/:id` | Elimina una fase e aggiorna i riferimenti negli item collegati |
| `GET` | `/api/items` | Recupera tutti i Tool, le Idee e le Esigenze |
| `POST` | `/api/items` | Crea un nuovo elemento con associazione a una o più fasi |
| `PUT` | `/api/items/:id` | Aggiorna campi, coordinate canvas o fasi di un elemento |
| `DELETE` | `/api/items/:id` | Elimina definitivamente un elemento |
| `POST` | `/api/chat` | Endpoint per interagire con l'assistente Copilot (Gemini o OpenAI) |
| `GET` | `/api/settings` | Recupera la configurazione del provider AI attivo (API key mascherata) |
| `POST` | `/api/settings` | Salva la configurazione personalizzata OpenAI o reimposta Gemini |
| `POST` | `/api/settings/test` | Esegue un ping di test verso l'endpoint AI fornito |
| `POST` | `/api/upload` | Caricamento allegati e screenshot in formato multipart/form-data |

---

## 💡 Best Practice Operative

1. **Definizione di nuove fasi**: Quando aggiungi una fase, puoi scegliere se posizionarla all'inizio, alla fine o tra due fasi esistenti; la numerazione e i collegamenti si aggiornano automaticamente.
2. **Tool trasversali**: Assegna al tool tutte le fasi coperte: la visualizzazione grafica genererà curve morbide che si aprono a ventaglio verso ciascuna fase centrale.
3. **Backup periodico**: Prima di sessioni estensive di refactoring dei processi, esegui `./backup-db.sh` per creare un punto di ripristino istantaneo dei dati.

---

<div align="center">

Realizzato per il team **Technology & Architecture (T&A)**  
*Mappa, collabora, automatizza.*

</div>
