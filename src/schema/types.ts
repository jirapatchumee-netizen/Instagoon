/**
 * Core Data Schema for Web Visual Novel Engine
 * Pure TypeScript definitions with zero external runtime dependencies.
 */

export type CharacterPosition = 'left' | 'center' | 'right' | 'far-left' | 'far-right';

export interface CharacterDef {
  id: string;
  name: string;
  color: string;
  avatar?: string; // Small portrait for dialogue box
  sprites: Record<string, string>; // emotion key -> image URL or SVG data URI (e.g. "normal", "happy", "serious", "shocked")
}

export interface BackgroundDef {
  id: string;
  name: string;
  src: string; // Image URL or SVG data URI
}

export interface AudioDef {
  id: string;
  name: string;
  src: string;
  type: 'bgm' | 'sfx' | 'voice';
}

// -------------------------------------------------------------
// Story Node Types
// -------------------------------------------------------------

export type NodeType = 'dialogue' | 'choice' | 'branch' | 'set_variable' | 'end';

export interface BaseNode {
  id: string;
  type: NodeType;
  title?: string;
}

export interface CharacterStagePlacement {
  characterId: string;
  expression: string;
  position: CharacterPosition;
  isSpeaking?: boolean;
  animation?: 'bounce' | 'shake' | 'fade-in' | 'none';
}

export interface DialogueNode extends BaseNode {
  type: 'dialogue';
  speakerId?: string; // undefined = Narrator
  customSpeakerName?: string;
  text: string;
  backgroundId?: string;
  characters?: CharacterStagePlacement[];
  bgmId?: string;
  sfxId?: string;
  voiceId?: string;
  cameraEffect?: 'shake' | 'flash' | 'zoom' | 'none';
  nextId?: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  condition?: string; // e.g. "affinity >= 5" or "has_key == true"
  setVariables?: Record<string, any>;
  targetNodeId: string;
}

export interface ChoiceNode extends BaseNode {
  type: 'choice';
  prompt?: string;
  options: ChoiceOption[];
}

export interface BranchNode extends BaseNode {
  type: 'branch';
  condition: string; // e.g. "clues_found >= 2"
  trueTargetId: string;
  falseTargetId: string;
}

export interface SetVariableNode extends BaseNode {
  type: 'set_variable';
  variableName: string;
  operation: 'set' | 'add' | 'subtract';
  value: any;
  nextId: string;
}

export interface EndNode extends BaseNode {
  type: 'end';
  endingName: string;
  message?: string;
  retryNodeId?: string; // Checkpoint to jump back to if player wants to retry this event
}

export type StoryNode = DialogueNode | ChoiceNode | BranchNode | SetVariableNode | EndNode;

// -------------------------------------------------------------
// Complete Project Manifest
// -------------------------------------------------------------

export interface VNProject {
  id: string;
  meta: {
    title: string;
    author: string;
    version: string;
    description?: string;
    resolution?: { width: number; height: number };
  };
  characters: Record<string, CharacterDef>;
  backgrounds: Record<string, BackgroundDef>;
  audio: Record<string, AudioDef>;
  initialVariables: Record<string, any>;
  startNodeId: string;
  nodes: Record<string, StoryNode>;
}

// -------------------------------------------------------------
// Runtime & Persistence Types
// -------------------------------------------------------------

export interface HistoryEntry {
  nodeId: string;
  speakerName: string;
  speakerColor: string;
  text: string;
  timestamp: number;
}

export interface SaveMetadata {
  slotId: string;
  title: string;
  timestamp: number;
  previewText: string;
  thumbnail?: string; // Base64 data URL
}

export interface SaveData {
  slotId: string;
  projectId: string;
  timestamp: number;
  currentNodeId: string;
  variables: Record<string, any>;
  history: HistoryEntry[];
  currentBgId?: string;
  currentBgmId?: string;
  characters?: CharacterStagePlacement[];
  thumbnail?: string;
}

export interface PlayerSettings {
  textSpeed: number; // ms per char (e.g. 25ms = fast, 50ms = normal)
  autoSpeed: number; // delay before auto next (e.g. 2000ms)
  bgmVolume: number; // 0.0 to 1.0
  sfxVolume: number; // 0.0 to 1.0
  voiceVolume: number; // 0.0 to 1.0
}
