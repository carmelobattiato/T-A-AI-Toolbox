import React, { useMemo, useCallback } from 'react';
import { matchesAge, matchesTagQuery } from '../../utils/filters.ts';
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
import { CategoryLabelNode } from './CategoryLabelNode.tsx';
import { RelationEdge } from './RelationEdge.tsx';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Compass,
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
}

// Inner component so we can use `useReactFlow()`
const GraphInner: React.FC<ToolboxGraphProps> = ({
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
  const [isMiniMapCollapsed, setIsMiniMapCollapsed] = React.useState(true);

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
      position: { x: -200, y: 110 },
      data: {
        category: 'TOOL_IDEA',
        title: 'Tool e WiP',
        subtitle: 'Asset e soluzioni di automazione T&A',
        countLabel: `${totalTools} tool · ${totalIdeas} WiP`,
      },
      draggable: false,
      selectable: false,
    });

    nodes.push({
      id: 'category-label-phase',
      type: 'categoryLabel',
      position: { x: -200, y: 366 },
      data: {
        category: 'PHASE',
        title: 'Fasi Processo T&A',
        subtitle: 'Sequenza end-to-end a matitone',
        countLabel: `${sortedPhases.length} fasi`,
      },
      draggable: false,
      selectable: false,
    });

    nodes.push({
      id: 'category-label-need',
      type: 'categoryLabel',
      position: { x: -200, y: 640 },
      data: {
        category: 'NEED',
        title: 'Esigenze',
        subtitle: 'Bisogni operativi e gap da colmare',
        countLabel: `${totalNeeds} esigenze`,
      },
      draggable: false,
      selectable: false,
    });

    // 1. Position Phases and Inter-Phase (+) Buttons
    // Initial AddPhase button before first phase
    nodes.push({
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
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        {/* Subtle grid dots background */}
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#E2E8F0" />

        {/* Panoramica Integrated Card in bottom-left corner */}
        <div className="absolute bottom-5 left-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 pointer-events-auto overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[11px] font-bold tracking-wider text-slate-800 uppercase">
                Panoramica
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMiniMapCollapsed(!isMiniMapCollapsed)}
              className="p-1 hover:text-slate-900 text-slate-400 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
              title={isMiniMapCollapsed ? 'Espandi Panoramica' : 'Comprimi Panoramica'}
            >
              {isMiniMapCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!isMiniMapCollapsed ? (
            <div className="p-2 bg-slate-50/40">
              <MiniMap
                zoomable
                pannable
                style={{
                  width: 200,
                  height: 110,
                  background: '#FAFBFD',
                  margin: 0,
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                }}
                maskColor="rgba(161, 0, 255, 0.08)"
                maskStrokeColor="#7928CA"
                maskStrokeWidth={1.5}
                nodeBorderRadius={6}
                nodeColor={(n) => {
                  if (n.type === 'phase') return '#3B82F6';
                  if (n.type === 'tool') return '#2563EB';
                  if (n.type === 'idea') return '#9333EA';
                  if (n.type === 'need') return '#16A34A';
                  return 'transparent';
                }}
              />
              {/* Integrated mini legend */}
              <div className="flex items-center justify-around px-1 pt-2 pb-0.5 text-[9px] text-slate-500 font-semibold border-t border-slate-100/80 mt-1.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600" /> Tool
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-600" /> WiP
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" /> Esigenze
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsMiniMapCollapsed(false)}
              className="px-3.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
            >
              <span className="text-[10px] font-medium">Mostra mappa</span>
            </div>
          )}
        </div>

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
            title="Reset vista 100%"
          >
            100%
          </button>
          <button
            type="button"
            onClick={handleFitView}
            className="px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
            title="Adatta vista a tutto lo schermo"
          >
            Adatta
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
