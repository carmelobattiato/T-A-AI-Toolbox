import React, { useMemo, useCallback } from 'react';
import { matchesAge, matchesTagQuery } from '../../utils/filters.ts';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
} from '@xyflow/react';
import { Phase, Item, FilterState, Practice } from '../../types/index.ts';
import { PhaseNode } from './PhaseNode.tsx';
import { ToolNode } from './ToolNode.tsx';
import { IdeaNode } from './IdeaNode.tsx';
import { NeedNode } from './NeedNode.tsx';
import { AddPhaseNode } from './AddPhaseNode.tsx';
import { CategoryLabelNode } from './CategoryLabelNode.tsx';
import { RelationEdge } from './RelationEdge.tsx';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

const nodeTypes = {
  phase: PhaseNode,
  tool: ToolNode,
  idea: IdeaNode,
  need: NeedNode,
  addPhase: AddPhaseNode,
  categoryLabel: CategoryLabelNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

interface ToolboxGraphProps {
  readOnly: boolean;
  practices: Practice[];
  practiceId: string;
  canCreatePractice: boolean;
  onSelectPractice: (practiceId: string) => void;
  onCreatePractice: () => void;
  phases: Phase[];
  items: Item[];
  filters: FilterState;
  focusedPhaseId: string | null;
  focusedItemId: string | null;
  isDrawerOpen?: boolean;
  onSelectPhase: (phaseId: string) => void;
  onSelectItem: (item: Item) => void;
  onClearFocus: () => void;
  onAddPhase: (targetIndex: number) => void;
  onAddTool: (phaseId: string) => void;
  onAddIdea: (phaseId: string) => void;
  onAddNeed: (phaseId: string) => void;
  onUpdateItemPosition: (itemId: string, x: number, y: number) => void;
  // Called when the nodes stay unmeasured (so invisible): the wrapper rebuilds the canvas
  onStuck?: () => void;
  // Called once every node is measured and visible
  onHealthy?: () => void;
}

// Inner component so we can use `useReactFlow()`
const GraphInner: React.FC<ToolboxGraphProps> = ({
  onStuck,
  onHealthy,
  readOnly,
  practices,
  practiceId,
  canCreatePractice,
  onSelectPractice,
  onCreatePractice,
  phases,
  items,
  filters,
  focusedPhaseId,
  focusedItemId,
  isDrawerOpen,
  onSelectPhase,
  onSelectItem,
  onClearFocus,
  onAddPhase,
  onAddTool,
  onAddIdea,
  onAddNeed,
  onUpdateItemPosition,
}) => {
  const { zoomIn, zoomOut, setViewport, fitView } = useReactFlow();

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
    const phaseStartX = 140; // Shift phases right to leave detached space from left category labels

    // Counts for Category Labels
    const totalTools = items.filter(i => i.type === 'TOOL').length;
    const totalIdeas = items.filter(i => i.type === 'IDEA').length;
    const totalNeeds = items.filter(i => i.type === 'NEED').length;

    // 0. Integrated Category Labels
    // Attached to graph canvas, zooms and pans naturally, detached to the left and vertically aligned to areas
    nodes.push({
      id: 'category-label-tool-idea',
      type: 'categoryLabel',
      position: { x: -263, y: 110 },
      data: {
        category: 'TOOL_IDEA',
        title: 'Tools & WiP',
        subtitle: 'Automation assets and solutions',
        countLabel: `${totalTools} ${totalTools === 1 ? 'tool' : 'tools'} · ${totalIdeas} WiP`,
      },
      draggable: false,
      selectable: false,
    });

    nodes.push({
      id: 'category-label-phase',
      type: 'categoryLabel',
      position: { x: -263, y: 366 },
      data: {
        category: 'PHASE',
        title: 'Process Phases',
        subtitle: 'End-to-end chevron sequence',
        countLabel: `${sortedPhases.length} ${sortedPhases.length === 1 ? 'phase' : 'phases'}`,
        practices,
        practiceId,
        canCreatePractice,
        onSelectPractice,
        onCreatePractice,
      },
      // Above the other nodes so the practice menu is never covered. Label nodes are neither selectable
      // nor draggable, so React Flow would make them ignore the mouse: the menu needs it.
      zIndex: 20,
      style: { pointerEvents: 'all' },
      draggable: false,
      selectable: false,
    });

    nodes.push({
      id: 'category-label-need',
      type: 'categoryLabel',
      position: { x: -263, y: 640 },
      data: {
        category: 'NEED',
        title: 'Needs',
        subtitle: 'Operational needs and gaps to close',
        countLabel: `${totalNeeds} ${totalNeeds === 1 ? 'need' : 'needs'}`,
      },
      draggable: false,
      selectable: false,
    });

    // 1. Position Phases and Inter-Phase (+) Buttons
    // Initial AddPhase button before first phase
    if (!readOnly) nodes.push({
      id: 'add-phase-start',
      type: 'addPhase',
      position: { x: phaseStartX - 44, y: centerY + 31 },
      data: {
        targetIndex: 0,
        onAddPhase,
        isDimmed: !!(focusedPhaseId || focusedItemId),
      },
      draggable: false,
    });

    sortedPhases.forEach((phase, idx) => {
      const phaseX = phaseStartX + idx * (phaseWidth + phaseGap);
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
          readOnly,
          onAddTool,
          onAddIdea,
          onAddNeed,
        },
        draggable: false,
      });

      // Add inter-phase (+) button between this and next phase
      if (!readOnly) nodes.push({
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
      if (!matchesAge(item, filters.maxAgeDays)) return false;
      if (!matchesTagQuery(item, filters.tagQuery)) return false;
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
    const topSlots = new Map<number, number>();

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

      // Compute ideal X centered over covered phases
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
          itemX = phaseStartX + 40;
        }
      }

      const slotIndex = Math.round(itemX / 140);
      const countInSlot = topSlots.get(slotIndex) || 0;
      topSlots.set(slotIndex, countInSlot + 1);

      // Vertical tiers above phases: 170 (closest), 30 (mid), -110 (top), -250 (higher)
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
        draggable: !readOnly,
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
    // Placed well below phases with ample breathing room to prevent overlap with bottom UI
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
          itemX = phaseStartX + 40;
        }
      }

      const slotIndex = Math.round(itemX / 140);
      const countInSlot = bottomSlots.get(slotIndex) || 0;
      bottomSlots.set(slotIndex, countInSlot + 1);

      // Vertical tiers below phases: 540 (closest), 680 (mid), 820 (low), 960 (lower)
      const tiersY = [540, 680, 820, 960];
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
        draggable: !readOnly,
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
    readOnly,
    practices,
    practiceId,
    canCreatePractice,
    onSelectPractice,
    onCreatePractice,
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

  // Sync state when layout recalculates. New node objects would lose the sizes React Flow already
  // measured (and stay invisible until measured again), so the previous measurements are carried over.
  React.useEffect(() => {
    setNodes(prev => {
      const previous = new Map(prev.map(n => [n.id, n]));
      return initialNodes.map(node => {
        const old = previous.get(node.id);
        return old?.measured ? { ...node, measured: old.measured } : node;
      });
    });
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Safety net: nodes that remain unmeasured are hidden by React Flow. If that lasts, rebuild the canvas.
  const nodesInitialized = useNodesInitialized();
  React.useEffect(() => {
    if (nodesInitialized) {
      onHealthy?.();
      return;
    }
    if (nodes.length === 0 || !onStuck) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      // Background tabs do not measure anything: wait until the tab is visible again
      if (document.hidden) return;
      timer = setTimeout(onStuck, 1500);
    };
    arm();
    document.addEventListener('visibilitychange', arm);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', arm);
    };
  }, [nodesInitialized, nodes.length, onStuck, onHealthy]);

  // Handle saving position after user drags an item (Spec 54)
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (!readOnly && (node.type === 'tool' || node.type === 'idea' || node.type === 'need')) {
        onUpdateItemPosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
      }
    },
    [readOnly, onUpdateItemPosition]
  );

  const handleResetView = () => {
    setViewport({ x: 260, y: 130, zoom: 0.82 });
  };

  const handleFitView = () => {
    fitView({ padding: 0.2, duration: 400 });
  };

  return (
    <div className="w-full h-full relative select-none bg-[#FAFBFD]">
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
        defaultViewport={{ x: 260, y: 130, zoom: 0.82 }}
        minZoom={0.25}
        maxZoom={1.8}
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        {/* Subtle grid dots background */}
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#E2E8F0" />

        {/* Zoom & Fullscreen Controls in bottom-right (Spec 47) - Clear separation from drawers and assistant */}
        <div
          className={`absolute bottom-6 z-20 flex items-center bg-white rounded-full shadow-lg border border-slate-200 p-1 text-slate-700 pointer-events-auto transition-all duration-300 ${
            isDrawerOpen ? 'right-[610px] md:right-[660px]' : 'right-48'
          }`}
        >
          <button
            type="button"
            onClick={() => zoomOut()}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Reset view to 100%"
          >
            100%
          </button>
          <button
            type="button"
            onClick={handleFitView}
            className="px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
            title="Fit view to the whole screen"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => zoomIn()}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
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
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </ReactFlow>
    </div>
  );
};

export const ToolboxGraph: React.FC<ToolboxGraphProps> = (props) => {
  // Changing the key rebuilds the whole canvas (see onStuck in GraphInner)
  const [canvasKey, setCanvasKey] = React.useState(0);
  // Counted here, not in GraphInner: it survives the rebuilds. Gives up after 3 tries in a row.
  const rebuilds = React.useRef(0);
  const rebuild = useCallback(() => {
    if (rebuilds.current >= 3) return;
    rebuilds.current += 1;
    setCanvasKey(k => k + 1);
  }, []);
  const healthy = useCallback(() => {
    rebuilds.current = 0;
  }, []);
  return (
    <ReactFlowProvider key={canvasKey}>
      <GraphInner {...props} onStuck={rebuild} onHealthy={healthy} />
    </ReactFlowProvider>
  );
};
