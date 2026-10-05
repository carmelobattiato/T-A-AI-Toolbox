import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { db } from './store.ts';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Function Declarations per Gemini Function Calling
const searchItemsDeclaration: FunctionDeclaration = {
  name: 'search_items',
  description: 'Cerca tool, idee o esigenze nella knowledge base di T&A Toolbox.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Termine di ricerca (es. "terraform", "assessment", "diagrammi")' },
      type: { type: Type.STRING, description: 'Filtro opzionale per tipo: TOOL, IDEA, o NEED' }
    }
  }
};

const listPhasesDeclaration: FunctionDeclaration = {
  name: 'list_phases',
  description: 'Elenca tutte le fasi del processo T&A in ordine sequenziale con id, titolo e statistiche.',
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const getPhaseDeclaration: FunctionDeclaration = {
  name: 'get_phase',
  description: 'Ottiene i dettagli di una fase specifica (titolo, descrizione, attività, tool ed esigenze collegati).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      phaseId: { type: Type.STRING, description: 'ID della fase (es. "phase-1") o titolo/numero' }
    },
    required: ['phaseId']
  }
};

const createToolDeclaration: FunctionDeclaration = {
  name: 'create_tool',
  description: 'Crea un nuovo Tool e lo associa a una o più fasi del processo T&A.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Nome del Tool' },
      description: { type: Type.STRING, description: 'Descrizione completa del tool' },
      summary: { type: Type.STRING, description: 'Sintesi breve (1 riga)' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array di ID delle fasi associate (es. ["phase-1", "phase-2"])'
      },
      owner: { type: Type.STRING, description: 'Owner o POC del tool' },
      generalizationRequired: { type: Type.BOOLEAN, description: 'Se il tool richiede generalizzazione (default false)' },
      githubUrl: { type: Type.STRING, description: 'URL GitHub' },
      catalogUrl: { type: Type.STRING, description: 'URL Catalog aziendale' },
      demoUrl: { type: Type.STRING, description: 'URL demo' }
    },
    required: ['title', 'phaseIds']
  }
};

const createIdeaDeclaration: FunctionDeclaration = {
  name: 'create_idea',
  description: 'Crea una nuova Idea da sviluppare e la associa a una o più fasi.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Titolo dell\'idea' },
      problem: { type: Type.STRING, description: 'Problema che intende risolvere' },
      requirements: { type: Type.STRING, description: 'Requisiti tecnici o funzionali' },
      expectedBenefit: { type: Type.STRING, description: 'Beneficio atteso' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array di ID delle fasi'
      },
      owner: { type: Type.STRING, description: 'Autore / Proponente dell\'idea' }
    },
    required: ['title', 'phaseIds']
  }
};

const createNeedDeclaration: FunctionDeclaration = {
  name: 'create_need',
  description: 'Crea una nuova Esigenza operativa e la associa a una o più fasi.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Titolo dell\'esigenza' },
      description: { type: Type.STRING, description: 'Descrizione dettagliata del bisogno' },
      currentProcess: { type: Type.STRING, description: 'Come viene gestita l\'attività oggi' },
      desiredTool: { type: Type.STRING, description: 'Tool o agente desiderato' },
      desiredOutcome: { type: Type.STRING, description: 'Risultato desiderato' },
      phaseIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Array di ID delle fasi'
      }
    },
    required: ['title', 'phaseIds']
  }
};

const createPhaseDeclaration: FunctionDeclaration = {
  name: 'create_phase',
  description: 'Crea una nuova fase nel processo T&A e la inserisce nella sequenza.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Nome della nuova fase' },
      description: { type: Type.STRING, description: 'Descrizione dello scopo della fase' },
      targetIndex: { type: Type.NUMBER, description: 'Indice/posizione in cui inserire la fase' },
      activities: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Lista di attività principali'
      }
    },
    required: ['title']
  }
};

const toolsList = [
  searchItemsDeclaration,
  listPhasesDeclaration,
  getPhaseDeclaration,
  createToolDeclaration,
  createIdeaDeclaration,
  createNeedDeclaration,
  createPhaseDeclaration
];

function resolvePhaseId(input: string): string {
  const phases = db.getPhases();
  const lower = (input || '').toLowerCase();
  // Direct match
  const direct = phases.find(p => p.id === input);
  if (direct) return direct.id;

  // By title substring or number
  const match = phases.find(p =>
    p.title.toLowerCase().includes(lower) ||
    lower.includes(p.title.toLowerCase()) ||
    lower.includes(`fase ${p.position}`) ||
    lower.includes(`phase ${p.position}`)
  );
  if (match) return match.id;
  return phases[0]?.id || 'phase-1';
}

function executeTool(name: string, args: any, user: string) {
  switch (name) {
    case 'search_items': {
      const items = db.getItems({ search: args.query, type: args.type });
      return {
        count: items.length,
        items: items.map(i => ({
          id: i.id,
          title: i.title,
          type: i.type,
          phaseIds: i.phaseIds,
          generalizationRequired: i.generalizationRequired,
          summary: i.summary || i.description?.substring(0, 100)
        }))
      };
    }
    case 'list_phases': {
      const phases = db.getPhases();
      const allItems = db.getItems();
      return phases.map(p => ({
        id: p.id,
        position: p.position,
        title: p.title,
        description: p.description,
        toolsCount: allItems.filter(i => i.type === 'TOOL' && i.phaseIds.includes(p.id)).length,
        ideasCount: allItems.filter(i => i.type === 'IDEA' && i.phaseIds.includes(p.id)).length,
        needsCount: allItems.filter(i => i.type === 'NEED' && i.phaseIds.includes(p.id)).length,
      }));
    }
    case 'get_phase': {
      const phaseId = resolvePhaseId(args.phaseId);
      const phase = db.getPhase(phaseId);
      if (!phase) return { error: `Fase non trovata per ${args.phaseId}` };
      const items = db.getItems({ phaseId: phase.id });
      return {
        phase,
        tools: items.filter(i => i.type === 'TOOL'),
        ideas: items.filter(i => i.type === 'IDEA'),
        needs: items.filter(i => i.type === 'NEED')
      };
    }
    case 'create_tool': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid));
      const created = db.createItem({
        type: 'TOOL',
        title: args.title,
        description: args.description || args.summary || '',
        summary: args.summary || args.description?.slice(0, 80) || '',
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : ['phase-1'],
        owner: args.owner || user,
        generalizationRequired: args.generalizationRequired ?? false,
        githubUrl: args.githubUrl,
        catalogUrl: args.catalogUrl,
        demoUrl: args.demoUrl,
      }, user);
      return {
        success: true,
        createdItem: created,
        message: `Tool "${created.title}" creato e collegato alle fasi indicate.`
      };
    }
    case 'create_idea': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid));
      const created = db.createItem({
        type: 'IDEA',
        title: args.title,
        problem: args.problem,
        requirements: args.requirements,
        expectedBenefit: args.expectedBenefit,
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : ['phase-3'],
        owner: args.owner || user,
      }, user);
      return {
        success: true,
        createdItem: created,
        message: `Idea "${created.title}" creata con successo!`
      };
    }
    case 'create_need': {
      const resolvedPhaseIds = (args.phaseIds || []).map((pid: string) => resolvePhaseId(pid));
      const created = db.createItem({
        type: 'NEED',
        title: args.title,
        description: args.description || '',
        currentProcess: args.currentProcess,
        desiredTool: args.desiredTool,
        desiredOutcome: args.desiredOutcome,
        phaseIds: resolvedPhaseIds.length > 0 ? resolvedPhaseIds : ['phase-1'],
      }, user);
      return {
        success: true,
        createdItem: created,
        message: `Esigenza "${created.title}" registrata con successo!`
      };
    }
    case 'create_phase': {
      const created = db.createPhase({
        title: args.title,
        description: args.description || '',
        targetIndex: typeof args.targetIndex === 'number' ? args.targetIndex : undefined,
        activities: args.activities || []
      }, user);
      return {
        success: true,
        createdPhase: created,
        message: `Fase "${created.title}" inserita alla posizione ${created.position}.`
      };
    }
    default:
      return { error: `Tool sconosciuto: ${name}` };
  }
}

// Fallback logic when GEMINI_API_KEY is absent or in local dev without network
function executeLocalIntents(prompt: string, user: string) {
  const p = prompt.toLowerCase();
  const allPhases = db.getPhases();
  const allItems = db.getItems();

  // 1. Aggiungi esigenza
  if (p.includes('aggiungi un\'esigenza') || p.includes('aggiungi esigenza') || p.includes('nuova esigenza')) {
    // Determina la fase
    let targetPhase = allPhases.find(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (!targetPhase) {
      if (p.includes('readiness') || p.includes('provisioning')) targetPhase = allPhases.find(ph => ph.id === 'phase-3');
      else if (p.includes('assessment')) targetPhase = allPhases.find(ph => ph.id === 'phase-1');
      else if (p.includes('gap') || p.includes('design')) targetPhase = allPhases.find(ph => ph.id === 'phase-2');
      else if (p.includes('devops') || p.includes('adaptation')) targetPhase = allPhases.find(ph => ph.id === 'phase-4');
      else targetPhase = allPhases[1];
    }

    // Estrai titolo
    let title = 'Nuova Esigenza Operativa';
    const colonMatch = prompt.split(/:\s*/);
    if (colonMatch.length > 1) {
      title = colonMatch[1].split('.')[0].trim();
      if (title.length > 60) title = title.substring(0, 60);
    } else {
      title = prompt.replace(/aggiungi (un'esigenza|esigenza) (a|alla fase|in)?/i, '').trim();
    }

    const created = db.createItem({
      type: 'NEED',
      title,
      description: prompt,
      desiredTool: 'Agente / Tool automatizzato',
      phaseIds: [targetPhase ? targetPhase.id : 'phase-1'],
    }, user);

    return {
      reply: `Ho registrato l'esigenza **"${created.title}"** e l'ho associata alla fase **${targetPhase?.title || 'Assessment'}**. Il grafo è stato aggiornato in tempo reale.`,
      actionSummary: `Esigenza creata: "${created.title}"`,
      createdItem: created
    };
  }

  // 2. Aggiungi idea
  if (p.includes('aggiungi come idea') || p.includes('aggiungi idea') || p.includes('nuova idea')) {
    let targetPhases = allPhases.filter(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (targetPhases.length === 0) {
      if (p.includes('kubernetes') || p.includes('openshift') || p.includes('mcp')) {
        targetPhases = allPhases.filter(ph => ['phase-3', 'phase-4', 'phase-7'].includes(ph.id));
      } else {
        targetPhases = [allPhases[2] || allPhases[0]];
      }
    }

    let title = 'Nuova Idea';
    if (p.includes('mcp')) title = 'Kubernetes / OpenShift MCP';
    else {
      const match = prompt.match(/idea\s+(?:per|di)?\s*([^,.:]+)/i);
      if (match && match[1]) title = match[1].trim();
    }

    const created = db.createItem({
      type: 'IDEA',
      title,
      problem: prompt,
      requirements: 'Integrazione con cluster e protocollo MCP',
      phaseIds: targetPhases.map(ph => ph.id),
      owner: user,
    }, user);

    return {
      reply: `Ho aggiunto l'idea **"${created.title}"** collegata a: ${targetPhases.map(ph => ph.title).join(', ')}.`,
      actionSummary: `Idea creata: "${created.title}"`,
      createdItem: created
    };
  }

  // 3. Aggiungi fase
  if (p.includes('aggiungi fase') || p.includes('inserisci una fase') || p.includes('nuova fase')) {
    let title = 'Discovery Cliente';
    if (p.includes('discovery')) title = 'Discovery Cliente';
    else {
      const m = prompt.match(/fase\s+["']?([^"'.:,]+)["']?/i);
      if (m && m[1]) title = m[1].trim();
    }

    let targetIdx = 1; // Prima di assessment per default
    if (p.includes('prima di assessment')) {
      const assess = allPhases.find(ph => ph.id === 'phase-1');
      targetIdx = assess ? assess.position : 1;
    }

    const created = db.createPhase({
      title,
      description: 'Attività preliminari di allineamento e discovery con gli stakeholder.',
      targetIndex: targetIdx,
      activities: ['Kick-off meeting', 'Interviste stakeholder', 'Raccolta accessi e prerequisiti']
    }, user);

    return {
      reply: `Ho inserito la fase **"${created.title}"** alla posizione ${created.position}. Tutte le fasi successive sono state rinumerate automaticamente.`,
      actionSummary: `Fase inserita: "${created.title}"`,
      createdPhase: created
    };
  }

  // 4. Domande sui Tool di una fase
  if (p.includes('che tool abbiamo') || p.includes('quali tool') || p.includes('tool per')) {
    const matchedPhase = allPhases.find(ph => p.includes(ph.title.toLowerCase()) || p.includes(ph.id));
    if (matchedPhase) {
      const tools = allItems.filter(i => i.type === 'TOOL' && i.phaseIds.includes(matchedPhase.id));
      if (tools.length === 0) {
        return {
          reply: `Per la fase **${matchedPhase.title}** attualmente **non sono mappati Tool specifici** (questo evidenzia un gap di automazione). Puoi cliccare su "+" sopra la fase per aggiungerne uno!`
        };
      }
      const list = tools.map((t, i) => `${i + 1}. **${t.title}** ${t.generalizationRequired ? '*(Da generalizzare)*' : ''}: ${t.summary || t.description}`).join('\n');
      return {
        reply: `Per la fase **${matchedPhase.title}** abbiamo attualmente ${tools.length} tool:\n\n${list}`
      };
    }
  }

  // 5. Tool da generalizzare
  if (p.includes('generalizzare') || p.includes('da generalizzare')) {
    const generalizeTools = allItems.filter(i => i.type === 'TOOL' && i.generalizationRequired);
    const list = generalizeTools.map((t, i) => `${i + 1}. **${t.title}** (Copre: ${t.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')}) - Owner: ${t.owner || 'N/A'}`).join('\n');
    return {
      reply: `I seguenti **${generalizeTools.length} tool** sono contrassegnati come **"Da generalizzare"** per poter essere riutilizzati in altri progetti:\n\n${list}`
    };
  }

  // 6. Tool multi-fase
  if (p.includes('più fasi') || p.includes('multifase') || p.includes('trasversal')) {
    const multi = allItems.filter(i => i.type === 'TOOL' && i.phaseIds.length > 1);
    const list = multi.map(t => `- **${t.title}**: copre **${t.phaseIds.length} fasi** (${t.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')})`).join('\n');
    return {
      reply: `I tool trasversali che coprono più fasi sono:\n\n${list}`
    };
  }

  // 7. Esigenze scoperte o aperte
  if (p.includes('esigenze') || p.includes('gap')) {
    const needs = allItems.filter(i => i.type === 'NEED');
    const list = needs.slice(0, 5).map(n => `- **${n.title}** (${n.phaseIds.map(pid => allPhases.find(p => p.id === pid)?.title).join(', ')}): ${n.summary || n.description}`).join('\n');
    return {
      reply: `Ci sono attualmente **${needs.length} esigenze operative** aperte mappate sul processo. Eccone alcune prioritarie:\n\n${list}\n\nPuoi cliccare sulle sfere verdi nella mappa per approfondirle.`
    };
  }

  // Risposta informativa di default
  return {
    reply: `Sono il **T&A Assistant**. Conosco l'intero processo end-to-end (${allPhases.length} fasi), i tool esistenti, le idee e le esigenze operative.
Puoi chiedermi di:
- *"Che tool abbiamo per Assessment?"*
- *"Quali tool coprono più fasi?"*
- *"Quali tool devono essere generalizzati?"*
- *"Aggiungi un'esigenza alla fase Readiness: Generazione automatica Terraform"*
- *"Aggiungi come idea un MCP per Kubernetes"*
- *"Inserisci una fase Discovery Cliente prima di Assessment"*`
  };
}

export async function handleAssistantChat(userMessage: string, user: string = 'local.user'): Promise<{ reply: string; actionSummary?: string }> {
  // If GEMINI_API_KEY is available, invoke Gemini 3.8 Flash with tools
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    try {
      const allPhases = db.getPhases();
      const allItems = db.getItems();
      const systemInstruction = `Sei l'assistente esperto di T&A AI Toolbox per Accenture Technology & Architecture.
L'applicazione visualizza il processo di lavoro T&A a "matitoni" centrali con sfere sopra (Tool e Idee) e sfere sotto (Esigenze).
Hai accesso a funzioni di sistema per cercare elementi, consultare le fasi, creare nuovi tool, nuove idee, nuove esigenze e nuove fasi.
Rispondi sempre in modo chiaro, autorevole, professionale e conciso in lingua italiana.
Quando l'utente ti chiede di creare o aggiungere un tool, un'idea, un'esigenza o una fase, USA SEMPRE i tools forniti per effettuare l'operazione sul database.
Non inventare mai ID casuali: usa gli ID o i nomi reali delle fasi (es. ${allPhases.map(p => `${p.position}: ${p.title} [${p.id}]`).join(', ')}).
Attualmente ci sono ${allItems.length} elementi (${allItems.filter(i => i.type === 'TOOL').length} tool, ${allItems.filter(i => i.type === 'IDEA').length} idee, ${allItems.filter(i => i.type === 'NEED').length} esigenze).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userMessage,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: toolsList }]
        }
      });

      // Handle function calls
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        let actionSummary = '';
        const toolResponses = [];

        for (const call of functionCalls) {
          if (!call.name) continue;
          const result = executeTool(call.name, call.args, user);
          toolResponses.push(result);
          if (result && (result as any).message) {
            actionSummary = (result as any).message;
          }
        }

        // Second turn to generate conversational response acknowledging the tool output
        const followUp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            { role: 'user', parts: [{ text: userMessage }] },
            {
              role: 'model',
              parts: functionCalls.map(c => ({
                functionCall: { name: c.name, args: c.args }
              }))
            },
            {
              role: 'user',
              parts: [{ text: `Risultati dell'esecuzione:\n${JSON.stringify(toolResponses, null, 2)}\nSpiega all'utente cosa è stato fatto.` }]
            }
          ],
          config: {
            systemInstruction
          }
        });

        return {
          reply: followUp.text || 'Operazione completata con successo.',
          actionSummary
        };
      }

      return {
        reply: response.text || 'Ho elaborato la tua richiesta.'
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic intent engine:', err);
    }
  }

  // Deterministic engine fallback
  const result = executeLocalIntents(userMessage, user);
  return {
    reply: result.reply,
    actionSummary: result.actionSummary
  };
}
