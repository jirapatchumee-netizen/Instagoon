import React, { useState } from 'react';
import { VNProject, StoryNode, DialogueNode, ChoiceNode } from '@/schema/types';
import { VNPlayer } from '../engine/ui/VNPlayer';
import {
  Layers,
  MessageSquare,
  GitBranch,
  Play,
  Download,
  Plus,
  Users,
  Image,
  Trash2,
} from 'lucide-react';

interface StudioViewProps {
  project: VNProject;
  onUpdateProject: (newProject: VNProject) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ project, onUpdateProject }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(project.startNodeId);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const selectedNode = project.nodes[selectedNodeId];

  // Helper to update a node
  const handleUpdateNode = (updated: StoryNode) => {
    onUpdateProject({
      ...project,
      nodes: {
        ...project.nodes,
        [updated.id]: updated,
      },
    });
  };

  // Helper to add a new dialogue node
  const handleAddDialogueNode = () => {
    const newId = `node_${Date.now().toString(36)}`;
    const newNode: DialogueNode = {
      id: newId,
      type: 'dialogue',
      text: 'ข้อความบทสนทนาใหม่...',
      characters: [],
    };

    onUpdateProject({
      ...project,
      nodes: {
        ...project.nodes,
        [newId]: newNode,
      },
    });
    setSelectedNodeId(newId);
  };

  // Helper to export project JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.id || 'visual_novel'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-vn-bg text-zinc-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-white/10 bg-black/40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg shadow-md shadow-purple-500/20">
            🎭
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">{project.meta.title}</h1>
            <span className="text-xs text-zinc-400">Frost Novel Studio</span>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-vn-accent text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Story Graph & Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Playtest</span>
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportJSON}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export JSON</span>
        </button>
      </header>

      {/* Main Workspace Body */}
      {activeTab === 'preview' ? (
        <div className="flex-1 p-4 sm:p-8 flex items-center justify-center bg-black/50">
          <VNPlayer project={project} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Node Navigator */}
          <aside className="w-80 border-r border-white/10 bg-black/20 flex flex-col">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Story Nodes ({Object.keys(project.nodes).length})
              </span>
              <button
                onClick={handleAddDialogueNode}
                className="flex items-center gap-1 px-2 py-1 rounded bg-vn-accent/30 hover:bg-vn-accent text-white text-xs font-semibold transition-colors"
                title="เพิ่มบทสนทนาใหม่"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มฉาก</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {Object.values(project.nodes).map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isStart = node.id === project.startNodeId;

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-vn-accent/20 border-vn-accent text-white shadow-sm'
                        : 'bg-white/5 border-white/5 hover:border-white/15 text-zinc-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      {node.type === 'dialogue' && <MessageSquare className="w-3.5 h-3.5 text-sky-400" />}
                      {node.type === 'choice' && <GitBranch className="w-3.5 h-3.5 text-amber-400" />}
                      {node.type === 'branch' && <GitBranch className="w-3.5 h-3.5 text-purple-400" />}
                      {node.type === 'end' && <div className="w-3.5 h-3.5 text-emerald-400 font-bold">🏁</div>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-semibold">{node.id}</span>
                        {isStart && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Start
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {node.type === 'dialogue' && (node as DialogueNode).text}
                        {node.type === 'choice' && (node as ChoiceNode).prompt}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Center / Right: Node Inspector Editor */}
          <main className="flex-1 overflow-y-auto p-6 bg-vn-card/40">
            {selectedNode ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span className="text-xs font-bold text-vn-accent uppercase">
                      Node Type: {selectedNode.type}
                    </span>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                        ID:
                      </span>
                      <h2 className="text-xl font-mono font-bold text-white tracking-wide select-all">{selectedNode.id}</h2>
                      <button
                        onClick={() => navigator.clipboard?.writeText(selectedNode.id)}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs text-zinc-300 font-mono flex items-center gap-1 transition-colors border border-white/10"
                        title="คลิกเพื่อคัดลอก Node ID สำหรับคุยกับ AI Agent"
                      >
                        <span>📋 คัดลอก ID</span>
                      </button>
                    </div>
                  </div>

                  {selectedNode.id !== project.startNodeId && (
                    <button
                      onClick={() => {
                        const { [selectedNode.id]: _, ...rest } = project.nodes;
                        onUpdateProject({ ...project, nodes: rest });
                        setSelectedNodeId(project.startNodeId);
                      }}
                      className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="ลบ Node นี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dialogue Node Editor */}
                {selectedNode.type === 'dialogue' && (
                  <div className="space-y-4">
                    {/* Speaker Selector */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>ตัวละครผู้พูด (Speaker)</span>
                        </label>
                        <select
                          value={(selectedNode as DialogueNode).speakerId || ''}
                          onChange={(e) =>
                            handleUpdateNode({
                              ...selectedNode,
                              speakerId: e.target.value || undefined,
                            } as DialogueNode)
                          }
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-zinc-200 focus:outline-none focus:border-vn-accent"
                        >
                          <option value="">Narrator (ผู้บรรยาย)</option>
                          {Object.values(project.characters).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Background Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5" />
                          <span>ฉากหลัง (Background)</span>
                        </label>
                        <select
                          value={(selectedNode as DialogueNode).backgroundId || ''}
                          onChange={(e) =>
                            handleUpdateNode({
                              ...selectedNode,
                              backgroundId: e.target.value || undefined,
                            } as DialogueNode)
                          }
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-zinc-200 focus:outline-none focus:border-vn-accent"
                        >
                          <option value="">คงเดิม (Keep current)</option>
                          {Object.values(project.backgrounds).map((bg) => (
                            <option key={bg.id} value={bg.id}>
                              {bg.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dialogue Text Area */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        ข้อความบทสนทนา (Dialogue Text)
                      </label>
                      <textarea
                        rows={4}
                        value={(selectedNode as DialogueNode).text}
                        onChange={(e) =>
                          handleUpdateNode({
                            ...selectedNode,
                            text: e.target.value,
                          } as DialogueNode)
                        }
                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm sm:text-base text-zinc-100 focus:outline-none focus:border-vn-accent leading-relaxed"
                      />
                    </div>

                    {/* Next Node Target */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        ฉากถัดไป (Next Node Target)
                      </label>
                      <select
                        value={(selectedNode as DialogueNode).nextId || ''}
                        onChange={(e) =>
                          handleUpdateNode({
                            ...selectedNode,
                            nextId: e.target.value || undefined,
                          } as DialogueNode)
                        }
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-zinc-200 focus:outline-none focus:border-vn-accent"
                      >
                        <option value="">(ไม่มี - สิ้นสุดหรือต้องเลือก)</option>
                        {Object.keys(project.nodes).map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Choice Node Editor */}
                {selectedNode.type === 'choice' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">
                        หัวข้อคำถาม (Choice Prompt)
                      </label>
                      <input
                        type="text"
                        value={(selectedNode as ChoiceNode).prompt || ''}
                        onChange={(e) =>
                          handleUpdateNode({
                            ...selectedNode,
                            prompt: e.target.value,
                          } as ChoiceNode)
                        }
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-zinc-100 focus:outline-none focus:border-vn-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">
                        ตัวเลือกบทสนทนา (Options)
                      </label>
                      <div className="space-y-3">
                        {(selectedNode as ChoiceNode).options.map((opt, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2"
                          >
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => {
                                const newOpts = [...(selectedNode as ChoiceNode).options];
                                newOpts[idx] = { ...opt, label: e.target.value };
                                handleUpdateNode({ ...selectedNode, options: newOpts } as ChoiceNode);
                              }}
                              placeholder="ข้อความตัวเลือก..."
                              className="w-full px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs text-white"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400 whitespace-nowrap">ชี้ไปที่:</span>
                              <select
                                value={opt.targetNodeId}
                                onChange={(e) => {
                                  const newOpts = [...(selectedNode as ChoiceNode).options];
                                  newOpts[idx] = { ...opt, targetNodeId: e.target.value };
                                  handleUpdateNode({ ...selectedNode, options: newOpts } as ChoiceNode);
                                }}
                                className="w-full px-2 py-1 rounded bg-black/30 border border-white/10 text-xs text-zinc-200"
                              >
                                {Object.keys(project.nodes).map((id) => (
                                  <option key={id} value={id}>
                                    {id}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                เลือก Node ในแถบซ้ายมือเพื่อแก้ไข
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
};
