# T&A AI Toolbox

> Mappa intelligente e collaborativa del lavoro Technology & Architecture (T&A): visualizzazione grafica end-to-end con fasi centrali a “matitone”, Tool e Idee a sfere superiori, Esigenze operative a sfere inferiori, relazioni molti-a-molti, focus visuale e assistente AI integrato.

---

## 1. Panoramica e Obiettivi

**T&A AI Toolbox** è una web application collaborativa interna progettata per rappresentare visivamente l'intero ciclo di vita del lavoro Technology & Architecture. Permette al team di:

1. Visualizzare con chiarezza le **fasi sequenziali** del processo T&A (rappresentate da chevron orizzontali a matitone).
2. Esplorare i **Tool esistenti** (sfere blu con indicazione di generalizzazione richiesta).
3. Mappare le **Idee in valutazione** (sfere viola a bordo tratteggiato).
4. Monitorare le **Esigenze operative aperte** (sfere verdi collegate al processo).
5. Riconoscere immediatamente relazioni **molti-a-molti** (es. un Tool che copre 2 o 7 fasi distinte contemporaneamente).
6. Individuare **gap di automazione** dove non esistono tool mappati.
7. Interagire con l'assistente conversazionale **T&A Assistant**, in grado sia di rispondere sullo stato del processo, sia di manipolare il grafo creando nuovi nodi tramite function calling.

---

## 2. Architettura Tecnica

- **Frontend**: React 19, TypeScript, Tailwind CSS, `@xyflow/react` (React Flow v12), Lucide Icons, Motion.
- **Backend**: Node.js, Express, TypeScript (`server.ts`).
- **Database & Persistenza**: JSON-backed ACID store persistente in `data/db.json` con predisposizione schema relazionale PostgreSQL / Prisma.
- **AI Engine**: Google GenAI SDK (`@google/genai`) con modello `gemini-3.8-flash` e function calling attivo (`search_items`, `list_phases`, `get_phase`, `create_tool`, `create_idea`, `create_need`, `create_phase`).
- **Polling Collaborativo**: Sync real-time multi-utente ogni 10 secondi.
- **Autenticazione**: Predisposta per SSO aziendale tramite header `X-Forwarded-User` con fallback locale.

---

## 3. Struttura Dati

### Phase (Fase del Processo)
- `id`: identificativo univoco (es. `phase-1`)
- `title`: nome della fase (es. `Assessment`)
- `description`: scopo della fase
- `activities`: lista delle attività principali
- `position`: ordine ordinale (0..N)
- `isCore`: boolean per proteggere le fasi standard

### Item (Tool, Idea, Esigenza)
- `id`: identificativo univoco
- `type`: `'TOOL' | 'IDEA' | 'NEED'`
- `title`: nome dell'elemento
- `summary`: sintesi breve
- `description`: descrizione approfondita
- `phaseIds`: array di ID delle fasi coperte (relazione **molti-a-molti**)
- `owner`: POC / Proponente
- `generalizationRequired`: boolean (`Da generalizzare`)
- `githubUrl`, `catalogUrl`, `demoUrl`: link per i tool
- `problem`, `requirements`, `expectedBenefit`: campi per le idee
- `currentProcess`, `desiredTool`, `desiredOutcome`: campi per le esigenze
- `positionX`, `positionY`: coordinate salvate dopo drag & drop manuale
- `attachments`: immagini/screenshot fino a 3 file da max 5MB

---

## 4. Installazione e Avvio Locale

### Requisiti
- Node.js 20+
- npm 9+

### Step di avvio
```bash
# 1. Clona il repository e installa le dipendenze
npm install

# 2. Configura le variabili d'ambiente
cp .env.example .env
# Inserisci la tua GEMINI_API_KEY se desideri l'AI live

# 3. Avvia l'applicazione in modalità development (porta 3000)
npm run dev
```

L'applicazione sarà disponibile all'indirizzo [http://localhost:3000](http://localhost:3000).

---

## 5. Esecuzione con Docker

È possibile avviare l'intero stack applicativo (App + Database PostgreSQL) tramite Docker Compose:

```bash
docker-compose up --build -d
```

I servizi avviati saranno:
- **App**: `http://localhost:3000`
- **Postgres**: `localhost:5432`

---

## 6. Modalità Focus (Comportamento Fondamentale)

- **Click su una Fase**:
  - La fase selezionata si illumina con bordo blu e glow (100% opacity).
  - Tutti i Tool, Idee ed Esigenze collegati a quella fase rimangono al 100% di opacità.
  - Le relazioni che collegano questi nodi alla fase selezionata vengono evidenziate a 100%.
  - Per i Tool multi-fase, le connessioni verso le altre fasi rimangono visibili ma attenuate (25%) per rendere evidente la trasversalità.
  - Tutte le altre fasi scendono al 25% di opacità.
  - Gli elementi non correlati scendono al 15% di opacità.
  - Si apre il **PhaseDrawer** laterale con le attività, i contatori e la lista dei nodi.
- **Click su un Item**:
  - Il nodo si evidenzia al 100%.
  - Tutte le fasi che copre vengono evidenziate contemporaneamente.
  - Si apre l'**ItemDrawer** con dettagli, link GitHub/Catalog/Demo, tab screenshot e note.
- **Deselezione**:
  - Cliccando sul background del canvas o sulla [X] del drawer, tutto torna al 100% di opacità.

---

## 7. Funzionalità del Chatbot T&A Assistant

Il pulsante flottante in basso a destra apre la chat con il copilot AI:
- Risponde a domande come *"Che tool abbiamo per Assessment?"* o *"Quali tool coprono più fasi?"*.
- Identifica i gap di processo (*"Ci sono esigenze scoperte?"*).
- Esegue modifiche reali al grafo (*"Aggiungi un'esigenza a Readiness: Generazione automatica Terraform"*).
- Inserisce nuove fasi riordinando automaticamente l'intera sequenza.
