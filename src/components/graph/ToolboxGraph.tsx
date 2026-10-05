import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { Phase, Item, FilterState } from '../../types/index.ts';
import { PhaseNode } from './PhaseNode.tsx';
import { ToolNode } from './ToolNode.tsx';
import { IdeaNode } from './IdeaNode.tsx';
import { NeedNode } from './NeedNode.tsx';
import { AddPhaseNode } from './AddPhaseNode.tsx';
import { RelationEdge } from './RelationEdge.tsx';
import {
  Lightbulb,
  ChevronsRight,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw
} from 'lucide-react';

const nodeTypes = {
  phase: PhaseNode,
  tool: ToolNode,
  idea: IdeaNode,
  need: NeedNode,
  addPhase: AddPhaseNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

interface ToolboxGraphProps {
  phases: Phase[];
  items: Item[];
  filters: FilterState;
  focusedPhaseId: string | null;
  focusedItemId: string | null;
  onSelectPhase: (phaseId: string) => void;
  onSelectItem: (item: Item) => void;
  onClearFocus: () => void;
  onAddPhase: (targetIndex: number) => void;
  onAddTool: (phaseId: string) => void;
  onAddIdea: (phaseId: string) => void;
  onAddNeed: (phaseId: string) => void;
  onUpdateItemPosition: (itemId: string, x: number, y: number) => void;
}

// Inner component so we can use `useReactFlow()`
const GraphInner: React.FC<ToolboxGraphProps> = ({
  phases,
  items,
  filters,
  focusedPhaseId,
  focusedItemId,
  onSelectPhase,
  onSelectItem,
  onClearFocus,
  onAddPhase,
  onAddTool,
  onAddIdea,
  onAddNeed,
  onUpdateItemPosition,
}) => {
  const { zoomIn, zoomOut, setViewport, getZoom } = useReactFlow();

  // Selected item reference if any
  const focusedItem = useMemo(
    () => items.find(i => i.id === focusedItemId) || null,
    [items, focusedItemId]
  );

  // Compute Nodes and Edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const sortedPhases = [...phases].sort((a, b) => a.position - b.position);
    const phaseXMap = new Map<string, number>();

    const centerY = 360;
    const phaseWidth = 210;
    const phaseGap = 46; // Gap includes the AddPhase circular button

    // 1. Position Phases and Inter-Phase (+) Buttons
    // Initial AddPhase button before first phase
    nodes.push({
      id: 'add-phase-start',
      type: 'addPhase',
      position: { x: -44, y: centerY + 31 },
      data: {
        targetIndex: 0,
        onAddPhase,
        isDimmed: !!(focusedPhaseId || focusedItemId),
      },
      draggable: false,
    });

    sortedPhases.forEach((phase, idx) => {
      const phaseX = idx * (phaseWidth + phaseGap);
      phaseXMap.set(phase.id, phaseX);

      const isPhaseSelected = focusedPhaseId === phase.id || (focusedItem?.phaseIds.includes(phase.id) ?? false);
      const isPhaseDimmed =
        (focusedPhaseId && focusedPhaseId !== phase.id) ||
        (focusedItem && !focusedItem.phaseIds.includes(phase.id));

      const phaseTools = items.filter(i => i.type === 'TOOL' && i.phaseIds.includes(phase.id));
      const phaseIdeas = items.filter(i => i.type === 'IDEA' && i.phaseIds.includes(phase.id));
      const phaseNeeds = items.filter(i => i.type === 'NEED' && i.phaseIds.includes(phase.id));

      nodes.push({
        id: phase.id,
        type: 'phase',
        position: { x: phaseX, y: centerY },
        data: {
          phase,
          isSelected: isPhaseSelected,
          isDimmed: !!isPhaseDimmed,
          toolsCount: phaseTools.length,
          ideasCount: phaseIdeas.length,
          needsCount: phaseNeeds.length,
          onSelect: onSelectPhase,
          onAddTool,
          onAddIdea,
          onAddNeed,
        },
        draggable: false,
      });

      // Add inter-phase (+) button between this and next phase
      nodes.push({
        id: `add-phase-after-${phase.id}`,
        type: 'addPhase',
        position: { x: phaseX + phaseWidth + 7, y: centerY + 31 },
        data: {
          targetIndex: phase.position + 1,
          onAddPhase,
          isDimmed: !!(focusedPhaseId || focusedItemId),
        },
        draggable: false,
      });
    });

    // 2. Filter Items according to header toggles & search
    const visibleItems = items.filter(item => {
      if (item.type === 'TOOL' && !filters.showTools) return false;
      if (item.type === 'IDEA' && !filters.showIdeas) return false;
      if (item.type === 'NEED' && !filters.showNeeds) return false;
      if (filters.onlyGeneralize && item.type === 'TOOL' && !item.generalizationRequired) {
        return false;
      }
      return true;
    });

    // Search query matching test
    const matchesSearch = (item: Item): boolean => {
      if (!filters.searchQuery.trim()) return true;
      const q = filters.searchQuery.toLowerCase();
      return Boolean(
        item.title.toLowerCase().includes(q) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.owner && item.owner.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.problem && item.problem.toLowerCase().includes(q)) ||
        (item.requirements && item.requirements.toLowerCase().includes(q)) ||
        (item.desiredTool && item.desiredTool.toLowerCase().includes(q)) ||
        (item.desiredOutcome && item.desiredOutcome.toLowerCase().includes(q))
      );
    };

    // 3. Layout Top Items (Tools & Ideas)
    const topItems = visibleItems.filter(i => i.type === 'TOOL' || i.type === 'IDEA');
    // Group top items by approximate anchor X to arrange them in tiers without collision
    const topSlots = new Map<number, number>(); // slotIndex -> count

    topItems.forEach((item) => {
      const isSearchMatch = matchesSearch(item);
      const isConnectedToFocusedPhase = focusedPhaseId ? item.phaseIds.includes(focusedPhaseId) : false;
      const isThisItemSelected = focusedItemId === item.id;

      let isDimmed = false;
      if (!isSearchMatch) {
        isDimmed = true;
      } else if (focusedPhaseId && !isConnectedToFocusedPhase) {
        isDimmed = true;
      } else if (focusedItemId && !isThisItemSelected) {
        isDimmed = true;
      }

      // Compute ideal X
      let itemX = 0;
      if (typeof item.positionX === 'number') {
        itemX = item.positionX;
      } else {
        const validXList = item.phaseIds
          .map(pid => phaseXMap.get(pid))
          .filter((x): x is number => typeof x === 'number');

        if (validXList.length > 0) {
          const avgX = validXList.reduce((acc, curr) => acc + curr + phaseWidth / 2, 0) / validXList.length;
          itemX = avgX - 60;
        } else {
          itemX = 100;
        }
      }

      // Slot index around increments of 140px
      const slotIndex = Math.round(itemX / 140);
      const countInSlot = topSlots.get(slotIndex) || 0;
      topSlots.set(slotIndex, countInSlot + 1);

      // Vertical tiers: 170 (closest), 30 (mid), -110 (top)
      const tiersY = [170, 30, -110, -250];
      const tierIndex = countInSlot % tiersY.length;
      const horizontalOffset = countInSlot > 0 ? (countInSlot % 2 === 1 ? -35 : 35) : 0;

      let itemY = typeof item.positionY === 'number' ? item.positionY : tiersY[tierIndex];
      if (typeof item.positionX !== 'number') {
        itemX += horizontalOffset;
      }

      nodes.push({
        id: item.id,
        type: item.type === 'TOOL' ? 'tool' : 'idea',
        position: { x: itemX, y: itemY },
        data: {
          item,
          phases: sortedPhases,
          isSelected: isThisItemSelected || (focusedPhaseId ? isConnectedToFocusedPhase : false),
          isDimmed,
          onSelect: onSelectItem,
        },
        draggable: true,
      });

      // Create curved edges from item to all covered phases
      item.phaseIds.forEach(pid => {
        if (!phaseXMap.has(pid)) return;

        const isDirectFocusEdge =
          (focusedPhaseId && focusedPhaseId === pid && item.phaseIds.includes(pid)) ||
          (focusedItemId && focusedItemId === item.id);

        const isMultiPhaseSecondary =
          focusedPhaseId &&
          item.phaseIds.includes(focusedPhaseId) &&
          pid !== focusedPhaseId;

        const edgeDimmed =
          !isSearchMatch ||
          (focusedPhaseId && !item.phaseIds.includes(focusedPhaseId)) ||
          (focusedItemId && focusedItemId !== item.id);

        edges.push({
          id: `edge-${item.id}-${pid}`,
          source: item.id,
          target: pid,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'relation',
          data: {
            type: item.type,
            isHighlighted: isDirectFocusEdge,
            isMultiPhaseSecondary,
            isDimmed: edgeDimmed,
          },
        });
      });
    });

    // 4. Layout Bottom Items (Needs / Esigenze)
    const bottomItems = visibleItems.filter(i => i.type === 'NEED');
    const bottomSlots = new Map<number, number>();

    bottomItems.forEach((item) => {
      const isSearchMatch = matchesSearch(item);
      const isConnectedToFocusedPhase = focusedPhaseId ? item.phaseIds.includes(focusedPhaseId) : false;
      const isThisItemSelected = focusedItemId === item.id;

      let isDimmed = false;
      if (!isSearchMatch) {
        isDimmed = true;
      } else if (focusedPhaseId && !isConnectedToFocusedPhase) {
        isDimmed = true;
      } else if (focusedItemId && !isThisItemSelected) {
        isDimmed = true;
      }

      let itemX = 0;
      if (typeof item.positionX === 'number') {
        itemX = item.positionX;
      } else {
        const validXList = item.phaseIds
          .map(pid => phaseXMap.get(pid))
          .filter((x): x is number => typeof x === 'number');

        if (validXList.length > 0) {
          const avgX = validXList.reduce((acc, curr) => acc + curr + phaseWidth / 2, 0) / validXList.length;
          itemX = avgX - 60;
        } else {
          itemX = 100;
        }
      }

      const slotIndex = Math.round(itemX / 130);
      const countInSlot = bottomSlots.get(slotIndex) || 0;
      bottomSlots.set(slotIndex, countInSlot + 1);

      // Vertical tiers below phases: 510 (closest), 650 (mid), 790 (low)
      const tiersY = [510, 650, 790, 930];
      const tierIndex = countInSlot % tiersY.length;
      const horizontalOffset = countInSlot > 0 ? (countInSlot % 2 === 1 ? -35 : 35) : 0;

      let itemY = typeof item.positionY === 'number' ? item.positionY : tiersY[tierIndex];
      if (typeof item.positionX !== 'number') {
        itemX += horizontalOffset;
      }

      nodes.push({
        id: item.id,
        type: 'need',
        position: { x: itemX, y: itemY },
        data: {
          item,
          phases: sortedPhases,
          isSelected: isThisItemSelected || (focusedPhaseId ? isConnectedToFocusedPhase : false),
          isDimmed,
          onSelect: onSelectItem,
        },
        draggable: true,
      });

      // Create curved edges from Phase bottom handle to Need top handle
      item.phaseIds.forEach(pid => {
        if (!phaseXMap.has(pid)) return;

        const isDirectFocusEdge =
          (focusedPhaseId && focusedPhaseId === pid && item.phaseIds.includes(pid)) ||
          (focusedItemId && focusedItemId === item.id);

        const isMultiPhaseSecondary =
          focusedPhaseId &&
          item.phaseIds.includes(focusedPhaseId) &&
          pid !== focusedPhaseId;

        const edgeDimmed =
          !isSearchMatch ||
          (focusedPhaseId && !item.phaseIds.includes(focusedPhaseId)) ||
          (focusedItemId && focusedItemId !== item.id);

        edges.push({
          id: `edge-${pid}-${item.id}`,
          source: pid,
          target: item.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'relation',
          data: {
            type: 'NEED',
            isHighlighted: isDirectFocusEdge,
            isMultiPhaseSecondary,
            isDimmed: edgeDimmed,
          },
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [
    phases,
    items,
    filters,
    focusedPhaseId,
    focusedItemId,
    focusedItem,
    onSelectPhase,
    onSelectItem,
    onAddPhase,
    onAddTool,
    onAddIdea,
    onAddNeed,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state when layout recalculates
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle saving position after user drags an item (Spec 54)
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (node.type === 'tool' || node.type === 'idea' || node.type === 'need') {
        onUpdateItemPosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
      }
    },
    [onUpdateItemPosition]
  );

  const handleResetView = () => {
    setViewport({ x: 100, y: 120, zoom: 0.85 });
  };

  return (
    <div className="w-full h-full relative select-none bg-[#FAFBFD]">
      {/* Category Labels on Left (as in Screenshot 1) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col justify-between h-[520px] select-none">
        {/* Tool & Idee Label */}
        <div className="flex items-start gap-2.5 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200/80 shadow-2xs max-w-[170px]">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-slate-800">Tool e Idee</div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Clicca + sopra la fase per aggiungere
            </div>
          </div>
        </div>

        {/* Fasi Processo T&A Label */}
        <div className="flex items-start gap-2.5 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200/80 shadow-2xs max-w-[170px]">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
            <ChevronsRight className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-slate-800">Fasi processo T&A</div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Clicca + tra le fasi o sulla fase per aggiungere
            </div>
          </div>
        </div>

        {/* Esigenze Label */}
        <div className="flex items-start gap-2.5 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200/80 shadow-2xs max-w-[170px]">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-slate-800">Esigenze</div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Clicca + sotto la fase per aggiungere
            </div>
          </div>
        </div>
      </div>

      {/* Main React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={onClearFocus}
        defaultViewport={{ x: 120, y: 110, zoom: 0.85 }}
        minZoom={0.25}
        maxZoom={1.8}
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        {/* Subtle grid dots background */}
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#E2E8F0" />

        {/* MiniMap in bottom-left corner (Spec 46) */}
        <div className="absolute bottom-5 left-6 z-20 bg-white p-2 rounded-xl shadow-lg border border-slate-200 pointer-events-auto">
          <div className="text-[10px] font-bold text-slate-500 mb-1">Panoramica</div>
          <MiniMap
            zoomable
            pannable
            className="!relative !m-0 !w-44 !h-24 !rounded-lg !border !border-slate-100 !bg-slate-50"
            nodeColor={(n) => {
              if (n.type === 'phase') return '#3B82F6';
              if (n.type === 'tool') return '#60A5FA';
              if (n.type === 'idea') return '#C084FC';
              if (n.type === 'need') return '#4ADE80';
              return '#CBD5E1';
            }}
          />
        </div>

        {/* Zoom & Fullscreen Controls in bottom-right (Spec 47) */}
        <div className="absolute bottom-6 right-48 z-20 flex items-center bg-white rounded-full shadow-lg border border-slate-200 p-1 text-slate-700 pointer-events-auto">
          <button
            type="button"
            onClick={() => zoomOut()}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            title="Reset vista 100%"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => zoomIn()}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            title="Schermo intero"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </ReactFlow>
    </div>
  );
};

export const ToolboxGraph: React.FC<ToolboxGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
};
