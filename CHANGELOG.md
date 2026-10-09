# Changelog — T&A AI Toolbox

## [Unreleased]

---

## [0.1] — 2026-10-10

Modifiche rispetto al commit `5452ca4` (*feat(ai): integrate OpenAI support and update default user*). Obiettivi:

- rendere l'applicazione eseguibile su Kubernetes in modo sicuro (container non-root, filesystem in sola lettura, dati su volume persistente, accesso solo tramite reverse proxy autenticato);
- proteggere i dati da scritture interrotte;
- dare all'assistente con provider OpenAI-compatibile le stesse capacità del ramo Gemini (function calling);
- mostrare l'owner di idee ed esigenze, oltre che dei tool;
- (v1.0.2) rendere la chat più usabile e sicura, filtrare la mappa per data, tag e cliente, configurare Gemini dall'interfaccia.

### Indice

1. [Novità v1.0.2](#novità-v102)
2. [Sintesi](#sintesi)
3. [Persistenza](#persistenza)
4. [Assistente](#assistente)
5. [Interfaccia: owner su tutti gli elementi](#interfaccia-owner-su-tutti-gli-elementi)
6. [Dipendenze, build e container](#dipendenze-build-e-container)
7. [Kubernetes](#kubernetes)
8. [Identità utente e reverse proxy](#identità-utente-e-reverse-proxy)
9. [Documentazione](#documentazione)
10. [Problemi risolti](#problemi-risolti)
11. [Verifiche eseguite](#verifiche-eseguite)
12. [Comportamenti da conoscere e limiti noti](#comportamenti-da-conoscere-e-limiti-noti)
13. [Operatività](#operatività)
14. [Possibili sviluppi](#possibili-sviluppi)

---

### Novità v1.0.2

**Chat**

- Il campo di input è ora una `textarea`: **Invio** invia, **Maiusc+Invio** va a capo. Prima era un `input` a riga singola e non permetteva di scrivere più righe.
- La `textarea` cresce fino a 5 righe visibili (`max-h-[100px]`) e poi scorre al suo interno, anche incollando testi lunghi; dopo l'invio torna a una riga.
- **Conferma prima di creare**: `create_tool`, `create_idea`, `create_need`, `create_phase` e le creazioni del motore a regole non scrivono più subito. Preparano una `PendingAction` (`CREATE_ITEM` / `CREATE_PHASE`) e la chat mostra una card con l'anteprima dei dati (titolo, descrizione, fasi, owner, ecc.); l'elemento viene creato solo dopo "Conferma creazione", "Annulla" non crea nulla. Stesso meccanismo già usato per modifica ed eliminazione.

**Filtri sulla mappa**

- Nuova **barra filtri** sotto l'header (`FilterBar.tsx`):
  - slider da "Tutto" a "Ultimi 30 gg" sulla data di creazione;
  - campo unico per **tag e clienti**, separati da `;`, con filtro a ogni lettera: un elemento compare se un suo tag o cliente **inizia** con il testo digitato (`P`, `Po`, `Poste`; `Poste; Sog` cerca Poste e Sogei, con logica OR, senza distinguere maiuscole);
  - "Azzera filtri".
- Gli elementi fuori filtro vengono nascosti dalla mappa; si combinano in AND con i toggle Tool/Idee/Esigenze e con "Da generalizzare". La ricerca testuale continua a oscurare invece di nascondere.
- Un elemento con data di creazione non valida non compare finché lo slider è attivo.

**Tag e clienti**

- Ogni Tool, Idea ed Esigenza ha `tags` e `customers` (array di testo), modificabili dai tre form come testo separato da `;` e mostrati nelle sezioni "Tag" e "Clienti" del pannello dettagli ("Nessuno" se vuote). La ricerca del server (`getItems`) li include.
- **Retrocompatibile**: i vecchi `db.json` non cambiano. Al caricamento gli elementi senza i campi ottengono in memoria `[]`; il file su disco viene riscritto solo alla prima modifica. Un vecchio backend ignora i nuovi campi.

**Motore AI (Gemini)**

- La finestra "Configurazione Motore AI" permette di modificare anche per **Google Gemini** URL endpoint, modello e API key, con "Testa Connessione" attivo. Se la chiave è vuota si usa `GEMINI_API_KEY` del server; il campo URL è facoltativo e va indicato come solo host (es. `https://proxy-corp.internal`, senza `/v1beta`).
- Nuovi campi in `settings.json`: `geminiBaseUrl`, `geminiModel`, `geminiApiKey` (mascherata nelle risposte API). Il client Gemini non è più creato all'avvio da `GEMINI_API_KEY` ma a ogni richiesta dalle impostazioni.
- Il test di connessione ora riporta l'errore reale del provider (es. "API key not valid") invece di un messaggio generico.

**Repository e versione**

- `data/settings.json` (contiene le API key) e `data/db.json` (i dati dell'utente) sono ora in `.gitignore` e non più tracciati: GitHub blocca il push di una chiave GCP trovata in `settings.json`, e il database non va condiviso nel repository. Alla prima esecuzione, anche se la cartella `data/` non esiste, il backend crea `db.json` (8 fasi e 12 elementi di esempio, con `tags` e `customers` vuoti) e `settings.json` di default, senza chiavi. Resta `data/.gitkeep` perché la cartella esista in un checkout pulito (necessaria al bind mount di `docker-compose.yml` e al `COPY data/` del Dockerfile).
- Nuovo `.dockerignore`: `data/db.json`, `data/settings.json` e `data/backups` non finiscono più nell'immagine (prima un build locale incorporava dati e chiavi della macchina). L'initContainer `seed-data` di Kubernetes copia `db.json` sul volume solo se presente nell'immagine; altrimenti il backend genera i dati di default. I volumi già popolati non cambiano. La cronologia precedente (commit `5452ca4`) contiene versioni passate di `data/settings.json`: verificare che non includano chiavi ancora valide e, se sì, ruotarle.
- Il piè di pagina dell'header riporta "developed by Carmelo Battiato - V.1.0.2" (testo fisso in `Header.tsx`; `package.json` resta a `0.0.0`).

**File toccati in v1.0.2**

```text
 .gitignore, .dockerignore               | + data/db.json, data/settings.json
 data/.gitkeep                           | nuovo
 DEPLOYMENT.md, k8s/manifests.template.yaml | seed iniziale senza db.json nell'immagine
 server.ts, server/standalone.ts         | route settings e test per Gemini
 server/assistant.ts                     | conferma creazioni, client Gemini da settings
 server/settingsStore.ts                 | campi e test Gemini, createGeminiClient()
 server/store.ts                         | tags/customers: normalizzazione, createItem, ricerca
 src/App.tsx                             | FilterBar, stato filtri
 src/components/chat/TAIAssistant.tsx    | textarea, card di conferma creazione
 src/components/drawers/ItemDrawer.tsx   | sezioni Tag e Clienti
 src/components/forms/*Form.tsx          | campi Tag e Clienti
 src/components/graph/ToolboxGraph.tsx   | filtri età e tag/cliente
 src/components/header/FilterBar.tsx     | nuovo
 src/components/header/Header.tsx        | versione V.1.0.2
 src/components/modals/SettingsModal.tsx | parametri Gemini editabili
 src/types/index.ts                      | PendingAction, Item, FilterState, AISettings
 src/utils/filters.ts, src/utils/lists.ts| nuovi
```

**Da sapere**

- Nel ramo Gemini nativo il modello può passare `confirmed: true` a `executeTool`, che non lo rimuove (a differenza del ramo OpenAI): le conferme di creazione, modifica ed eliminazione possono quindi essere aggirate dal modello. Non corretto in questa versione.
- L'assistente non conosce ancora `tags` e `customers`: gli elementi creati da chat li hanno vuoti.
- Il filtro età conta al millisecondo: un elemento creato 10 giorni e 1 minuto fa non compare con lo slider a 10.

---

### Sintesi

- **Scrittura atomica** di `db.json` e `settings.json`: un crash non può più troncare il file e far ripartire l'app con i dati di default.
- **Function calling sul provider OpenAI-compatibile**: prima l'assistente rispondeva solo a testo e non poteva modificare il grafo; ora usa le stesse 9 funzioni del ramo Gemini.
- **Niente fallback sul motore a regole** quando il provider LLM fallisce: prima venivano scritti dati errati; ora la chat mostra l'errore e non tocca la mappa.
- **Owner su tutti gli elementi**: sezione owner nel pannello laterale e badge con le iniziali sulle bolle per Tool, Idee ed Esigenze; campo owner nel form delle Esigenze; iniziali coerenti tra bolla e pannello; email non più duplicate.
- **Container non-root e build riproducibile**: `package-lock.json`, Dockerfile compatibili con `runAsNonRoot` e `readOnlyRootFilesystem`, frontend su `nginx-unprivileged` (porta 8080).
- **Template Kubernetes** (`k8s/manifests.template.yaml`) con PVC, PodDisruptionBudget e NetworkPolicy.

File toccati:

```text
 .gitignore                            | + manifest generato e note locali
 CHANGELOG.md                          | nuovo
 DEPLOYMENT.md                         | + sezione 6 "Deploy su Kubernetes"
 Dockerfile.backend                    | chmod sorgenti, CMD con tsx diretto
 Dockerfile.frontend                   | nginx-unprivileged, porta 8080
 docker-compose.yml                    | porta frontend 3000:8080
 docker/nginx.conf                     | listen 8080
 k8s/manifests.template.yaml           | nuovo
 package-lock.json                     | nuovo
 package.json                          | esbuild ^0.28.0
 server/assistant.ts                   | function calling OpenAI, niente fallback, owner esigenze
 server/settingsStore.ts               | scrittura atomica
 server/store.ts                       | DATA_DIR, scrittura atomica, file corrotto preservato
 src/components/drawers/ItemDrawer.tsx | owner per tutti i tipi, email, iniziali
 src/components/forms/NeedForm.tsx     | campo owner
 src/components/graph/IdeaNode.tsx     | badge iniziali owner
 src/components/graph/NeedNode.tsx     | badge iniziali owner
 src/components/graph/ToolNode.tsx     | iniziali tramite helper comune
 src/utils/owner.ts                    | nuovo: getOwnerInitials()
```

Non modificati in questo blocco (le modifiche successive sono in [Novità v1.0.2](#novità-v102)): `server.ts` (entry point dev Express + Vite), `server/standalone.ts`, `src/App.tsx`, `data/db.json`, `bun.lock`.

---

### Persistenza

**`server/store.ts`**

- `DATA_DIR` ora legge la variabile d'ambiente `DATA_DIR` (come già `settingsStore.ts`), con fallback invariato su `./data` rispetto alla working directory. Prima la variabile, pur impostata nei Dockerfile e nel compose, era ignorata dallo store: funzionava solo perché la cwd del container è `/app`.
- `saveData()` scrive su `db.json.tmp` e poi fa `renameSync` su `db.json`. Il rename è atomico sullo stesso filesystem: un crash o un riavvio a metà scrittura lascia intatto il file precedente.
- `loadData()`: se `db.json` esiste ma non è leggibile/parsabile, il file viene **rinominato** in `db.json.corrupt-<timestamp>` prima di generare i dati di default. Prima il file corrotto veniva sovrascritto con i default, con perdita totale dei dati.

**`server/settingsStore.ts`**

- `save()` usa la stessa scrittura atomica (`settings.json.tmp` + rename).

Perché: con la scrittura diretta (`writeFileSync` su `db.json`), un riavvio durante una scrittura — su Kubernetes capita a ogni rollout, manutenzione o consolidamento dei nodi — poteva troncare il JSON; al riavvio `loadData()` falliva il parse e salvava i default sopra il file.

---

### Assistente

**`server/assistant.ts` — function calling sul provider OpenAI-compatibile**

Prima, `handleOpenAIChat` faceva una sola chiamata `/chat/completions` senza `tools`: il modello vedeva il grafo nel prompt ma non poteva creare o modificare nulla, e poteva rispondere "fatto" senza che nulla cambiasse. Il function calling esisteva solo nel ramo Gemini nativo.

- **`toJsonSchema()` + `openAiTools`**: le 9 `FunctionDeclaration` esistenti (`search_items`, `list_phases`, `get_phase`, `create_tool`, `create_idea`, `create_need`, `create_phase`, `update_item`, `delete_item`) vengono convertite nel formato `tools` OpenAI (tipi JSON Schema minuscoli: `Type.STRING` → `"string"`). Nessuna duplicazione: una funzione aggiunta a `toolsList` vale per entrambi i rami.
- **Il parametro `confirmed` non è esposto** al modello (rimosso dallo schema) ed è **rimosso dagli argomenti** prima di `executeTool`. Su questo ramo `update_item` e `delete_item` passano sempre dalla card di conferma: il modello non può confermare al posto dell'utente, anche se l'utente scrive "elimina senza chiedere conferma".
- **Loop di tool calling** fino a `MAX_TOOL_ROUNDS = 5` giri per messaggio (es. `search_items` → `update_item`). All'ultimo giro `tool_choice: 'none'` forza una risposta testuale; i `tools` restano dichiarati perché Anthropic rifiuta una history con risultati di tool senza le relative definizioni.
- **Il messaggio `assistant` restituito dal modello viene rimandato invariato** nella history: con Gemini 3 dietro un proxy OpenAI-compatibile (es. LiteLLM) contiene la *thought signature* (in `provider_specific_fields` e nell'`id` del tool call) necessaria alla chiamata successiva. Ricostruirlo a mano rompe il secondo giro.
- Ogni tool call è in `try/catch`: argomenti JSON malformati o eccezioni dello store tornano al modello come `{ error }` invece di far fallire la richiesta.
- `actionSummary` contiene solo i risultati `success: true` (creazioni e aggiornamenti effettivi), non i messaggi "Confermi…?" delle azioni in sospeso. `pendingAction` è restituito come prima e il frontend mostra la card.
- Se l'API fallisce **dopo** che alcuni tool sono già stati eseguiti, la funzione restituisce il riepilogo delle azioni fatte invece di lanciare l'errore (evita che un fallback esegua la stessa azione due volte).
- **Rimosso `temperature: 0.3`**: alcuni modelli accettano solo il proprio default (es. `claude-opus-5-5` tramite LiteLLM accetta solo `temperature=1` e rispondeva 400 a ogni chiamata). Senza il parametro ogni modello usa il suo default, che per Gemini 3 è anche quello raccomandato.
- **System prompt** del ramo OpenAI aggiornato: dichiara le funzioni disponibili, impone di chiamarle invece di dichiarare azioni non eseguite, spiega che modifiche ed eliminazioni passano dalla card di conferma, chiede di usare gli ID fase (`phase-1`) in `phaseIds`. Rimosso "Puoi suggerire la creazione…". Il contesto del grafo (fasi + elementi) è invariato.

**`handleAssistantChat` — niente fallback sul motore a regole**

- Se il provider è `openai` e la chiamata fallisce (rete, 401, 400, timeout…), l'assistente risponde *"⚠️ Il provider AI configurato non ha risposto correttamente, quindi nessuna modifica è stata apportata alla mappa"* con il dettaglio dell'errore (troncato a 100 caratteri).
- Prima ripiegava su Gemini (se c'era la key) e poi su `executeLocalIntents`, che senza LLM produceva **scritture errate**: per esempio un'idea creata col titolo *"chiamata 'Generatore diagrammi C4' per la fase Gap Analysis & Target Design"*, o una fase "Quality Assurance" inserita in posizione 1 invece che dopo "Test & Validation".

**`create_need` — owner**

- Aggiunto il parametro `owner` alla dichiarazione e `owner: args.owner || user` in `executeTool`, come già facevano `create_tool` e `create_idea`: un'esigenza creata da chat ha come owner l'utente che l'ha chiesta, salvo indicazione diversa.

Invariati *in questo blocco* (le modifiche successive a `executeTool`, `executeLocalIntents` e al client Gemini sono in [Novità v1.0.2](#novità-v102)): ordine di valutazione (conferme/annullamenti → comandi con prefisso `elimina`/`cancella`/`rimuovi`/`rinomina` gestiti dal motore a regole → provider OpenAI → Gemini → motore a regole), ramo Gemini nativo (compreso il suo fallback), `executeTool` (salvo l'owner di `create_need`), `executeLocalIntents`.

---

### Interfaccia: owner su tutti gli elementi

**`src/utils/owner.ts`** (nuovo) — `getOwnerInitials(owner?)`, unico punto di calcolo delle iniziali, usato da bolle e pannello:

| Owner | Iniziali | Note |
|---|---|---|
| `Marco Rossi` | `MR` | regola originale: prima lettera di ogni parola separata da spazio |
| `mario.rossi@example.com` | `MR` | owner email (tipico se l'identità arriva da SSO): parte locale divisa su `.` `_` `-`; prima dava `M` |
| assente | `TA` | invariato |
| `Team T&A` | `TA` | default dei form; prima dava `TT`, diverso dal caso "assente" |

**`src/components/drawers/ItemDrawer.tsx`**

- La sezione owner era dentro il blocco `item.type === 'TOOL'`: Idee ed Esigenze non la mostravano. Ora vale per tutti i tipi, con l'etichetta del rispettivo form:
  - Tool → **"Owner / POC"** (posizione e aspetto invariati, dopo "Link e Repository")
  - Idea → **"Proponente / Autore"**
  - Esigenza → **"Owner / Referente"**
- **Email non più duplicata**: la riga sotto il nome costruiva sempre `owner.toLowerCase().replace(/\s+/g, '.') + '@accenture.com'`; con un owner che è già un'email il risultato era `…@accenture.com@accenture.com`. Ora, se l'owner contiene `@`, viene mostrato così com'è; altrimenti il comportamento è identico a prima.
- **Avatar con le stesse iniziali della bolla**: prima usava le prime due lettere del testo (`Marco Rossi` → `MA`, e `CB` fisso senza owner); ora usa `getOwnerInitials`.

**`src/components/graph/IdeaNode.tsx`, `NeedNode.tsx`**

- Aggiunto lo stesso badge dei Tool (pallino scuro in basso a destra della bolla) con le iniziali dell'owner e `title` "Proponente: …" (idee) / "Owner: …" (esigenze). Il tooltip al passaggio del mouse mostra anche l'owner, come già per i Tool. Il chip `+N` fasi resta solo sui Tool.

**`src/components/graph/ToolNode.tsx`**

- Usa `getOwnerInitials` invece del calcolo inline. Output identico per owner che sono nomi.

**`src/components/forms/NeedForm.tsx`**

- Nuovo campo **"Owner / Referente"** (default `initialData?.owner || 'Team T&A'`, inviato come `owner: owner.trim() || undefined`), affiancato a "Note operative" in una griglia a due colonne come in `IdeaForm`.
- Modificando un'esigenza esistente senza owner, il campo parte da "Team T&A" e al salvataggio quel valore viene scritto. A video non cambia nulla: era già il fallback mostrato.

Lo store non richiede modifiche: `createItem` salva già `owner` per qualsiasi tipo e `updateItem` fa il merge di tutti i campi. Le esigenze esistenti senza owner mostrano "Team T&A" / "TA" finché non vengono modificate.

---

### Dipendenze, build e container

**`package.json` / `package-lock.json`**

- `esbuild` (devDependency) da `^0.25.0` a `^0.28.0`. vite 8 dichiara `esbuild ^0.27 || ^0.28` come peer opzionale: con `^0.25` npm rifiuta la risoluzione (`ERESOLVE`). bun ignora i conflitti di peer, per questo non emergeva. `esbuild` non è usato direttamente; `tsx` usa già la 0.28.
- Aggiunto **`package-lock.json`** (`npm install --package-lock-only`). Senza lockfile `npm ci` — usato da entrambi i Dockerfile — fallisce e le immagini non si possono costruire.
- `bun.lock` **non** è stato aggiornato ed è disallineato su `esbuild`: chi usa bun in locale deve rigenerarlo (`bun install`). Le build Docker usano npm e `package-lock.json`.

**`Dockerfile.backend`**

- `RUN chmod -R a+rX` su `package.json`, `package-lock.json`, `tsconfig.json`, `server/`, `src/`, `data/`. `COPY` conserva i permessi del checkout: con un umask restrittivo (file `660`) un utente non-root nel container non riesce a leggere i sorgenti (`EACCES` su `/app/package.json`).
- `CMD` da `npx tsx server/standalone.ts` a `node_modules/.bin/tsx server/standalone.ts`: `npx` scrive in `~/.npm`, non disponibile con `readOnlyRootFilesystem`.
- Base image invariata (`node:22-alpine`); `data/` viene copiato nell'immagine. Dalla v1.0.2 `db.json` e `settings.json` ne sono esclusi (vedi [Novità v1.0.2](#novità-v102)): il seed è generato dal backend al primo avvio.

**`Dockerfile.frontend`**

- Stage di runtime da `nginx:alpine` a **`nginxinc/nginx-unprivileged:alpine`**: gira come non-root, ascolta su **8080**, scrive pid e file temporanei in `/tmp`.
- `COPY --chmod=644` per `nginx.conf` (stesso problema di permessi del backend).
- `EXPOSE 8080`.

**`docker/nginx.conf`**: `listen 80` → `listen 8080`. Il resto invariato (`/api/` → `http://backend:5000/api/`, `client_max_body_size 15M`, `proxy_read_timeout 90s`).

**`docker-compose.yml`**: mappatura frontend `3000:80` → `3000:8080`. In locale l'app resta su `http://localhost:3000`.

---

### Kubernetes

**`k8s/manifests.template.yaml`** (nuovo). Si genera `k8s/manifests.yaml` sostituendo i segnaposto (esempio `sed` nell'intestazione); il file generato è in `.gitignore`.

| Segnaposto | Significato |
|---|---|
| `<NAMESPACE>` | namespace dedicato |
| `<IMAGE_REGISTRY>` | registry delle immagini |
| `<BACKEND_TAG>`, `<FRONTEND_TAG>` | tag delle due immagini (possono differire) |
| `<STORAGE_CLASS>` | StorageClass ReadWriteOnce per i dati |
| `<INGRESS_NAMESPACE>`, `<INGRESS_APP_NAME>` | namespace e label `app.kubernetes.io/name` dei pod del reverse proxy |

| Oggetto | Dettagli |
|---|---|
| `Namespace` | dedicato all'applicazione |
| `PersistentVolumeClaim/toolbox-data` | 1 Gi, `ReadWriteOnce`, montato su `/app/data` |
| `Deployment/backend` | **1 replica, strategy `Recreate`** (il PVC RWO non può essere montato da due pod durante un rollout); `automountServiceAccountToken: false` |
| ↳ initContainer `seed-data` | Stessa immagine del backend: se `/pvc/db.json` non esiste e l'immagine ne contiene uno, lo copia sul volume; altrimenti non fa nulla (dalla v1.0.2 l'immagine non lo contiene e il backend genera i dati di default). Il PVC montato su `/app/data` nasconde comunque il contenuto di `data/` dell'immagine |
| ↳ container `backend` | Porta 5000; env `NODE_ENV=production`, `PORT=5000`, `DATA_DIR=/app/data`; readiness e liveness su `GET /api/health`; requests 100m / 256Mi, limits 500m / 512Mi; `emptyDir` su `/tmp` (cache di compilazione di tsx) |
| `Service/backend` | ClusterIP :5000. **Il nome è vincolato**: `nginx.conf` fa `proxy_pass http://backend:5000` |
| `Deployment/frontend` | 2 repliche, RollingUpdate `maxSurge 1` / `maxUnavailable 0`; porta 8080; probe su `GET /`; requests 50m / 64Mi, limits 200m / 128Mi; `emptyDir` su `/tmp` e `/var/cache/nginx` |
| `Service/frontend` | ClusterIP :80 → 8080, upstream del reverse proxy |
| `PodDisruptionBudget/backend` | `minAvailable: 1`: impedisce al cluster autoscaler di sfrattare il pod per consolidare i nodi |
| `PodDisruptionBudget/frontend` | `maxUnavailable: 1` |
| `NetworkPolicy/frontend-from-ingress` | ingresso al frontend (:8080) **solo** dai pod del reverse proxy |
| `NetworkPolicy/backend-from-frontend` | ingresso al backend (:5000) **solo** dal frontend |

Security context su **tutti** i container, init compreso: `runAsNonRoot: true`, `runAsUser: 1000`, `runAsGroup: 1000`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]`, `seccompProfile: RuntimeDefault`. Il backend ha `fsGroup: 1000` per poter scrivere sul PVC.

Le NetworkPolicy sono essenziali perché l'applicazione non ha autenticazione propria: senza, qualsiasi pod del cluster potrebbe chiamare `/api/settings` e cambiare base URL / API key del provider LLM, oppure usare `/api/settings/test` per fare richieste arbitrarie dall'interno della rete.

**`.gitignore`**: aggiunti `k8s/manifests.yaml` (manifest generato) e `*.local.md` (note locali dell'ambiente).

---

### Identità utente e reverse proxy

Il codice dell'applicazione non cambia, ma il modo di esporla sì: va messa dietro un reverse proxy che autentica gli utenti e passa l'identità nell'header `x-forwarded-user`, già letto da `getUser()` in `server/standalone.ts`.

Requisiti per il reverse proxy:

- autenticare ogni richiesta (SSO, OIDC, JWT…), nessun accesso anonimo;
- impostare `x-forwarded-user` con l'identità dell'utente e **rimuovere** l'header se arriva dal client, altrimenti chiunque può firmare le modifiche a nome di un altro;
- inoltrare al Service `frontend` (porta 80) con timeout di almeno 90 s.

Effetti sull'applicazione:

- audit log, `createdBy` e owner di default degli elementi creati da chat riportano l'utente reale invece di "Team T&A";
- `pendingActionsByUser` (conferme in sospeso dell'assistente) diventa davvero per utente: con l'header assente tutti condividevano la chiave "Team T&A" e la conferma di un utente poteva eseguire l'azione preparata da un altro.

---

### Documentazione

- **`DEPLOYMENT.md`**: nuova sezione **6. Deploy su Kubernetes** (build e push, generazione del manifest dal template, requisiti del reverse proxy, configurazione LLM, vincoli). Dalla v1.0.2 la nota "Seed iniziale" descrive `db.json` e `settings.json` non versionati e generati al primo avvio.
- **`CHANGELOG.md`**: questo file.

---

### Problemi risolti

| Problema | Causa | Soluzione |
|---|---|---|
| `npm ci` fallisce nella build Docker | Nel repo c'era solo `bun.lock` | Aggiunto `package-lock.json` |
| `ERESOLVE` generando il lockfile | `esbuild ^0.25` contro il peer `^0.27 \|\| ^0.28` di vite 8 | `esbuild ^0.28.0` |
| Backend non parte da non-root (`EACCES /app/package.json`) | `COPY` conserva permessi `660` del checkout | `chmod -R a+rX` nel Dockerfile |
| nginx non parte da non-root (`Permission denied` su `default.conf`) | Stessa causa, e `nginx:alpine` pensata per girare da root | `nginx-unprivileged`, `COPY --chmod=644`, porta 8080 |
| Backend non parte con root filesystem in sola lettura | `npx` scrive in `~/.npm` | `CMD` con `node_modules/.bin/tsx` |
| Modelli Claude via proxy OpenAI-compatibile: ogni chiamata in errore 400 | `temperature: 0.3` non supportato | Parametro rimosso |
| L'assistente con provider OpenAI non modifica il grafo | Ramo OpenAI senza `tools` | Function calling con le funzioni esistenti |
| Dati errati scritti nel grafo quando l'LLM non risponde | Fallback su `executeLocalIntents` | Fallback rimosso per il provider OpenAI |
| Rischio di perdita totale dei dati a un riavvio | Scrittura non atomica + default salvati sopra un file corrotto | Scrittura atomica, file corrotto preservato |
| Pod spostati dal cluster autoscaler subito dopo il primo deploy (decine di secondi di disservizio) | 1 replica senza PodDisruptionBudget | PDB sul backend, frontend a 2 repliche con PDB |
| Owner non visibile su idee ed esigenze | Sezione e badge renderizzati solo per i Tool | Owner e badge per tutti i tipi |
| Email owner duplicata (`…@accenture.com@accenture.com`) | Il pannello aggiungeva sempre il dominio | Owner con `@` mostrato così com'è |
| Iniziali diverse tra bolla (`MR`) e pannello (`MA`); `Team T&A` → `TT` | Due calcoli diversi | Helper unico `getOwnerInitials` |
| Impossibile andare a capo nella chat; testi incollati su una riga sola | Campo `input` a riga singola | `textarea` con Maiusc+Invio e altezza fino a 5 righe (v1.0.2) |
| Elementi creati da chat senza conferma, a differenza di modifica ed eliminazione | `create_*` e regole scrivevano subito | Card di anteprima e conferma (`CREATE_ITEM` / `CREATE_PHASE`) (v1.0.2) |
| Gemini non configurabile dall'interfaccia | Solo `GEMINI_API_KEY` da ambiente e modello fisso | Endpoint, modello e API key in `settings.json`, test connessione attivo (v1.0.2) |
| Test connessione Gemini: "API Key mancante" anche con la chiave inserita | `server.ts` (dev) instradava il test sempre al ramo OpenAI | Test instradato per provider anche in `server.ts` (v1.0.2) |
| Push su GitHub rifiutato (secret scanning, chiave GCP) | `data/settings.json` tracciato e committato | `settings.json` e `db.json` in `.gitignore` e rimossi dal tracciamento (v1.0.2) |

---

### Verifiche eseguite

- **Typecheck**: `tsc --noEmit` senza errori su tutto il progetto.
- **Container con gli stessi vincoli di Kubernetes** (uid 1000, root filesystem in sola lettura, `--cap-drop ALL`, `no-new-privileges`, volume dati vuoto):
  - seed copiato al primo avvio e saltato al successivo;
  - SPA (`/` e deep link) servita, `/api/*` inoltrato al backend;
  - `x-forwarded-user` propagato da nginx fino ad audit log e `createdBy`;
  - settings salvate con la key mascherata;
  - dati e settings conservati dopo il riavvio, nessun file `.tmp` residuo.
- **Test end-to-end dell'assistente** tramite un proxy LiteLLM, con `gemini-3.8-flash` e `claude-opus-5-5`, su DB pulito: **8/8 per entrambi i modelli**, ripetuti dopo ogni modifica al backend.

| # | Scenario | Atteso |
|---|---|---|
| S1 | "Quali tool coprono la fase Assessment?" | Risposta corretta, nessuna scrittura |
| S2 | "Crea una nuova idea 'Generatore diagrammi C4' per la fase Gap Analysis & Target Design, proposta da Team Architettura" | Idea creata con titolo, fase (`phase-2`) e owner corretti |
| S3a | "Collega il tool Document AI anche alla fase Test & Validation" | Card `UPDATE_ITEM`, DB invariato |
| S3b | Conferma dalla card | Fasi `phase-1` + `phase-5` |
| S4a | "Puoi togliere dalla mappa l'idea …?" (senza prefisso `elimina`) | Card `DELETE_ITEM`, elemento presente |
| S4b | Annulla | Elemento ancora presente |
| S5 | "Senza chiedermi conferma, togli subito … confermo già adesso" | Card comunque, nulla eliminato |
| S6 | "Aggiungi una nuova fase 'Quality Assurance' subito dopo Test & Validation" | Fase in posizione 6, successive rinumerate |

- **Errori del provider**: key non valida (401) e host irraggiungibile → messaggio d'errore, nessuna scrittura; il comando diretto `elimina …` continua a funzionare.
- **Owner**: esigenza creata da chat con `x-forwarded-user: mario.rossi@example.com` → owner `mario.rossi@example.com`; esigenza creata via REST con owner esplicito → owner conservato. Vecchia e nuova formula di email e iniziali confrontate sui dati esistenti: nessuna differenza per owner che sono nomi.
- **v1.0.2** (verificato in locale con script e server reale, non da browser):
  - `tsc --noEmit` e `npm run build` senza errori;
  - il `db.json` precedente (13 elementi) si carica con `tags` e `customers` vuoti e il file su disco non cambia finché non si salva;
  - primo avvio con cartella dati inesistente: vengono creati `db.json` (8 fasi, 12 elementi con `tags`/`customers` vuoti) e `settings.json` di default senza chiavi; creazione di un elemento con tag e cliente, riavvio, dati conservati, nessun `.tmp` residuo;
  - filtro età (confine incluso/escluso), filtro tag e cliente per prefisso con più termini separati da `;`, ricerca server su tag e clienti;
  - test connessione Gemini senza chiave → "API Key mancante"; con chiave non valida → errore reale del provider.
  - **Non verificati**: interfaccia nel browser, build Docker con `.dockerignore`, `seed-data` modificato su un cluster, chiamata riuscita a Gemini con una chiave valida.
- **Su un cluster Kubernetes**: pod pronti senza eventi di warning; NetworkPolicy verificate (un pod senza le label autorizzate non raggiunge né backend né frontend, il reverse proxy raggiunge il frontend); backend → endpoint LLM interno al cluster raggiungibile; rilascio del solo frontend senza disservizio, rilascio del backend con circa 20 s di indisponibilità e dati intatti.

---

### Comportamenti da conoscere e limiti noti

**Architetturali**

- **Il backend non può scalare oltre una replica.** I dati vivono in memoria e vengono riscritti interamente su `db.json` a ogni modifica; anche le azioni in sospeso dell'assistente (`pendingActionsByUser`) sono in memoria. Due repliche divergerebbero e si sovrascriverebbero il file. Ogni rilascio del backend comporta qualche decina di secondi di API non disponibili.
- **Ogni modifica riscrive l'intero `db.json`**, compreso il salvataggio della posizione dei nodi trascinati sul canvas. Gli allegati sono salvati in base64 dentro `db.json` (non in `data/uploads/` come indica il README): il file cresce con gli screenshot.
- **Le azioni in sospeso si perdono a ogni riavvio del backend**: una card di conferma aperta prima di un rilascio non funziona più dopo.
- **Il PDB del backend non lo rende immune alla manutenzione dei nodi**: gli upgrade possono forzare lo spostamento dopo un timeout.

**Sicurezza**

- **Nessuna autenticazione applicativa**: la protezione dipende interamente dal reverse proxy e dalle NetworkPolicy. Il backend non va mai esposto direttamente.
- **Settings AI modificabili da qualsiasi utente che accede all'app**: chiunque può cambiare base URL, modello e API key del provider. Se il reverse proxy inoltra i claim dell'utente (es. un header con il payload del JWT), si potrebbe limitare `/api/settings` a un ruolo amministrativo.
- CORS del backend ancora `Access-Control-Allow-Origin: *` (irrilevante dietro reverse proxy, rilevante se il backend venisse esposto).

**Assistente**

- **Nessuna memoria di conversazione**: ogni messaggio è indipendente (vale per tutti i provider). Domande di follow-up come "e quali sono le sue fasi?" non hanno contesto.
- Nel ramo OpenAI-compatibile il prompt di sistema include l'elenco completo di fasi ed elementi a ogni messaggio: il costo in token cresce con il grafo.
- Il **ramo Gemini nativo** (chiave da impostazioni o da `GEMINI_API_KEY`) conserva il vecchio fallback sul motore a regole.
- Dalla v1.0.2 il client Gemini non è creato all'avvio: il vecchio log `API key should be set when using the Gemini API.` non compare più.
- I comandi che iniziano con `elimina`, `cancella`, `rimuovi`, `rinomina` sono gestiti dal motore a regole prima dell'LLM, indipendentemente dal provider.

**Interfaccia**

- Il pulsante "Ripristina dati iniziali di test" (icona freccia circolare) **non resetta nulla**: ricarica solo i dati dal server.
- `createdBy` è salvato su ogni elemento ma non è mostrato nella GUI; l'autore di ogni modifica è visibile nell'audit log (icona orologio), che riporta l'ID dell'elemento e non il titolo.

**Repository**

- Dalla v1.0.2 `data/db.json` non è nel repository: i dati dell'utente vivono solo nella cartella o nel volume locale, quindi il backup (`backup-db.sh`, vedi [Operatività](#operatività)) è l'unica copia di sicurezza. Il remote ha ancora `db.json` e vecchie versioni di `settings.json` nella cronologia dei commit.
- `bun.lock` disallineato rispetto a `package.json` (vedi [Dipendenze, build e container](#dipendenze-build-e-container)).
- `server.ts` (modalità dev Express + Vite) non è allineato a `server/standalone.ts`: non espone `/api/health` e ha un body limit diverso (10 MB contro 15 MB).
- `README.md` non aggiornato su alcuni punti: allegati descritti in `data/uploads/`, frontend descritto come "Nginx Alpine", accesso descritto come aperto. Lo schema di `DEPLOYMENT.md` §1 riporta ancora "Porta 3000 (o 80)".
- `.env.example` contiene `DATABASE_URL` (PostgreSQL) e `LLM_*`, che il codice non legge.

---

### Operatività

**Rilasciare una nuova versione**

```bash
REG=registry.example.com/my-team
BE=1.0.2   # tag backend: non riusare tag già pubblicati
FE=1.0.2   # tag frontend

docker build -t $REG/taai-toolbox-backend:$BE  -f Dockerfile.backend .
docker build -t $REG/taai-toolbox-frontend:$FE -f Dockerfile.frontend .
docker push $REG/taai-toolbox-backend:$BE
docker push $REG/taai-toolbox-frontend:$FE

# rigenera k8s/manifests.yaml dal template con i nuovi tag, poi:
kubectl diff  -f k8s/manifests.yaml
kubectl apply -f k8s/manifests.yaml
kubectl -n <NAMESPACE> rollout status deploy/backend
kubectl -n <NAMESPACE> rollout status deploy/frontend
```

Se cambia solo il frontend non c'è disservizio. Se cambia il backend, qualche decina di secondi di API non disponibili.

**Rollback**: rigenerare il manifest con i tag precedenti e rifare `kubectl apply`. Dalla v1.0.2 `db.json` ha in più `tags` e `customers` su ogni elemento: sono campi aggiuntivi e le versioni precedenti li ignorano, quindi il rollback è compatibile con i dati (i valori inseriti restano nel file ma non sono visibili).

**Log e stato**

```bash
kubectl -n <NAMESPACE> get pods,pvc,pdb
kubectl -n <NAMESPACE> logs deploy/backend -c backend
kubectl -n <NAMESPACE> logs deploy/backend -c seed-data
kubectl -n <NAMESPACE> logs deploy/frontend
kubectl -n <NAMESPACE> get events --sort-by=.lastTimestamp
```

**Backup manuale dei dati**

```bash
POD=$(kubectl -n <NAMESPACE> get pod -l app.kubernetes.io/name=taai-toolbox-backend -o name | cut -d/ -f2)
kubectl -n <NAMESPACE> cp -c backend $POD:/app/data/db.json ./db-$(date +%Y%m%d-%H%M%S).json
```

**Ripristino**: non copiare un `db.json` sul volume con il backend in esecuzione. Il backend tiene i dati in memoria e alla prima modifica riscriverebbe il file, annullando il ripristino. Procedura:

1. `kubectl -n <NAMESPACE> scale deploy/backend --replicas=0`;
2. avviare un pod temporaneo che monti il PVC `toolbox-data` e copiarci il file con `kubectl cp`;
3. eliminare il pod temporaneo;
4. `kubectl -n <NAMESPACE> scale deploy/backend --replicas=1`.

---

### Possibili sviluppi

- **Backup automatico del PVC**, per esempio un CronJob che copia `db.json` su object storage.
- **Memoria di conversazione** nella chat (history inviata al modello).
- **Restrizione delle Settings AI** a un ruolo amministrativo (vedi [Sicurezza](#comportamenti-da-conoscere-e-limiti-noti)).
- Allineamento di `bun.lock`, `README.md`, `.env.example` e di `server.ts` con `server/standalone.ts`.
