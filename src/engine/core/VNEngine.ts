/**
 * Central Visual Novel Engine State Machine
 */

import {
  VNProject,
  StoryNode,
  DialogueNode,
  ChoiceNode,
  HistoryEntry,
  CharacterStagePlacement,
  PlayerSettings,
  SaveData,
} from '@/schema/types';
import { audioManager } from '../audio/WebAudioManager';
import { SaveManager } from '../storage/SaveManager';

export interface EngineSnapshot {
  nodeId: string;
  variables: Record<string, any>;
  characters: CharacterStagePlacement[];
  currentBgId?: string;
  currentBgmId?: string;
  historyLength: number;
}

export interface EngineState {
  currentNode: StoryNode | null;
  currentBgId?: string;
  characters: CharacterStagePlacement[];
  variables: Record<string, any>;
  history: HistoryEntry[];
  canRollback: boolean;
  isAutoPlay: boolean;
  isSkipMode: boolean;
  isTyping: boolean;
  displayedText: string;
  cameraEffect?: 'shake' | 'flash' | 'zoom' | 'none';
  isEnded: boolean;
  endingName?: string;
  endingMessage?: string;
  retryNodeId?: string;
}

export class VNEngine {
  public project: VNProject;
  public saveManager: SaveManager;

  private state: EngineState;
  private snapshots: EngineSnapshot[] = [];
  private listeners: Set<(state: EngineState) => void> = new Set();

  private typewriterTimer: number | null = null;
  private autoPlayTimer: number | null = null;

  public settings: PlayerSettings = {
    textSpeed: 28, // ms per char
    autoSpeed: 1800, // wait ms after text finishes
    bgmVolume: 0.6,
    sfxVolume: 0.8,
    voiceVolume: 1.0,
  };

  constructor(project: VNProject) {
    this.project = project;
    this.saveManager = new SaveManager(project.id);

    const savedSettings = this.saveManager.loadSettings();
    if (savedSettings) {
      this.settings = { ...this.settings, ...savedSettings };
      audioManager.setBgmVolume(this.settings.bgmVolume);
      audioManager.setSfxVolume(this.settings.sfxVolume);
    }

    this.state = {
      currentNode: null,
      currentBgId: undefined,
      characters: [],
      variables: { ...project.initialVariables },
      history: [],
      canRollback: false,
      isAutoPlay: false,
      isSkipMode: false,
      isTyping: false,
      displayedText: '',
      cameraEffect: 'none',
      isEnded: false,
    };
  }

  public subscribe(listener: (state: EngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const currentState = this.getState();
    this.listeners.forEach((fn) => fn(currentState));
  }

  public getState(): EngineState {
    return {
      ...this.state,
      canRollback: this.snapshots.length > 0 && !this.state.isEnded,
    };
  }

  public start() {
    this.snapshots = [];
    this.state.variables = { ...this.project.initialVariables };
    this.state.history = [];
    this.state.isEnded = false;
    this.goToNode(this.project.startNodeId);
  }

  public goToNode(nodeId: string, recordSnapshot = true) {
    const node = this.project.nodes[nodeId];
    if (!node) {
      console.warn(`Node ${nodeId} not found in project`);
      return;
    }

    this.clearTimers();

    if (node.type === 'dialogue') {
      const dialogue = node as DialogueNode;

      if (recordSnapshot && this.state.currentNode) {
        this.snapshots.push({
          nodeId: this.state.currentNode.id,
          variables: { ...this.state.variables },
          characters: [...this.state.characters],
          currentBgId: this.state.currentBgId,
          currentBgmId: this.state.currentNode.type === 'dialogue' ? (this.state.currentNode as DialogueNode).bgmId : undefined,
          historyLength: this.state.history.length,
        });
      }

      // Update background if provided
      if (dialogue.backgroundId) {
        this.state.currentBgId = dialogue.backgroundId;
      }

      // Update characters if provided
      if (dialogue.characters) {
        this.state.characters = [...dialogue.characters];
      } else if (this.state.characters.length) {
        this.state.characters = this.state.characters.map((c) => ({ ...c, isSpeaking: c.characterId === dialogue.speakerId }));
      }

      // Audio triggers
      if (dialogue.sfxId) {
        audioManager.playSound(dialogue.sfxId as any);
      }
      if (dialogue.bgmId) {
        audioManager.playBGM(dialogue.bgmId as any);
      }

      // Camera effect
      this.state.cameraEffect = dialogue.cameraEffect || 'none';

      // History entry
      const speakerName = dialogue.speakerId
        ? this.project.characters[dialogue.speakerId]?.name || dialogue.customSpeakerName || ''
        : dialogue.customSpeakerName || '';
      const speakerColor = dialogue.speakerId
        ? this.project.characters[dialogue.speakerId]?.color || '#ffffff'
        : '#ffffff';

      this.state.history.push({
        nodeId: dialogue.id,
        speakerName,
        speakerColor,
        text: dialogue.text,
        timestamp: Date.now(),
      });

      this.state.currentNode = dialogue;
      this.startTypewriter(dialogue.text);

      // Trigger Auto-save every 5 nodes
      if (this.snapshots.length > 0 && this.snapshots.length % 5 === 0) {
        this.autoSave();
      }
    } else if (node.type === 'choice') {
      this.state.currentNode = node;
      this.state.isTyping = false;
      this.state.displayedText = '';
      this.emit();
    } else if (node.type === 'branch') {
      const conditionPassed = this.evalCondition(node.condition);
      this.goToNode(conditionPassed ? node.trueTargetId : node.falseTargetId, false);
    } else if (node.type === 'set_variable') {
      const currentVal = this.state.variables[node.variableName] ?? 0;
      if (node.operation === 'set') {
        this.state.variables[node.variableName] = node.value;
      } else if (node.operation === 'add') {
        this.state.variables[node.variableName] = Number(currentVal) + Number(node.value);
      } else if (node.operation === 'subtract') {
        this.state.variables[node.variableName] = Number(currentVal) - Number(node.value);
      }
      this.goToNode(node.nextId, false);
    } else if (node.type === 'end') {
      this.state.currentNode = node;
      this.state.isEnded = true;
      this.state.endingName = node.endingName;
      this.state.endingMessage = node.message;
      this.state.retryNodeId = (node as any).retryNodeId;
      this.state.isTyping = false;
      audioManager.playSound('fanfare');
      this.emit();
    }
  }

  public retryCheckpoint(nodeId: string) {
    this.clearTimers();
    this.state.isEnded = false;
    this.state.isTyping = false;
    this.goToNode(nodeId, false);
  }

  private startTypewriter(fullText: string) {
    if (this.state.isSkipMode || this.settings.textSpeed <= 0) {
      this.state.displayedText = fullText;
      this.state.isTyping = false;
      this.emit();
      this.handleTypingComplete();
      return;
    }

    this.state.isTyping = true;
    this.state.displayedText = '';
    let charIndex = 0;

    const tick = () => {
      charIndex += 1;
      this.state.displayedText = fullText.slice(0, charIndex);

      // Play subtle typewriter sound every 2 characters
      if (charIndex % 2 === 0) {
        audioManager.playSound('typewriter');
      }

      this.emit();

      if (charIndex < fullText.length) {
        this.typewriterTimer = window.setTimeout(tick, this.settings.textSpeed);
      } else {
        this.state.isTyping = false;
        this.emit();
        this.handleTypingComplete();
      }
    };

    tick();
  }

  public completeTypewriter() {
    if (!this.state.isTyping || !this.state.currentNode) return;
    if (this.state.currentNode.type === 'dialogue') {
      this.clearTimers();
      this.state.displayedText = (this.state.currentNode as DialogueNode).text;
      this.state.isTyping = false;
      this.emit();
      this.handleTypingComplete();
    }
  }

  private handleTypingComplete() {
    if (this.state.isAutoPlay && !this.state.isEnded) {
      this.autoPlayTimer = window.setTimeout(() => {
        this.step();
      }, this.settings.autoSpeed);
    } else if (this.state.isSkipMode && !this.state.isEnded) {
      this.autoPlayTimer = window.setTimeout(() => {
        this.step();
      }, 100);
    }
  }

  /**
   * Advance to the next statement or finish typing
   */
  public step() {
    if (this.state.isEnded) return;

    if (this.state.isTyping) {
      this.completeTypewriter();
      return;
    }

    if (!this.state.currentNode) return;

    if (this.state.currentNode.type === 'dialogue') {
      const dialogue = this.state.currentNode as DialogueNode;
      if (dialogue.nextId) {
        audioManager.playSound('click');
        this.goToNode(dialogue.nextId);
      }
    }
  }

  /**
   * Choose an option on a choice node
   */
  public makeChoice(optionIndex: number) {
    if (!this.state.currentNode || this.state.currentNode.type !== 'choice') return;
    const choiceNode = this.state.currentNode as ChoiceNode;
    const option = choiceNode.options[optionIndex];
    if (!option) return;

    audioManager.playSound('choice');

    // Apply variable updates if attached to choice
    if (option.setVariables) {
      Object.entries(option.setVariables).forEach(([k, v]) => {
        this.state.variables[k] = v;
      });
    }

    this.goToNode(option.targetNodeId);
  }

  /**
   * Step backward in time to the previous state snapshot
   */
  public rollback(): boolean {
    if (this.snapshots.length === 0) return false;

    this.clearTimers();
    const lastSnap = this.snapshots.pop()!;

    this.state.variables = { ...lastSnap.variables };
    this.state.characters = [...lastSnap.characters];
    this.state.currentBgId = lastSnap.currentBgId;
    this.state.history = this.state.history.slice(0, lastSnap.historyLength);
    this.state.isEnded = false;
    this.state.isAutoPlay = false;
    this.state.isSkipMode = false;

    audioManager.playSound('click');
    this.goToNode(lastSnap.nodeId, false);
    return true;
  }

  public toggleAutoPlay() {
    this.state.isAutoPlay = !this.state.isAutoPlay;
    if (this.state.isAutoPlay) {
      this.state.isSkipMode = false;
      if (!this.state.isTyping) {
        this.handleTypingComplete();
      }
    } else {
      this.clearTimers();
    }
    this.emit();
  }

  public toggleSkipMode() {
    this.state.isSkipMode = !this.state.isSkipMode;
    if (this.state.isSkipMode) {
      this.state.isAutoPlay = false;
      this.completeTypewriter();
      this.handleTypingComplete();
    } else {
      this.clearTimers();
    }
    this.emit();
  }

  private clearTimers() {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    if (this.autoPlayTimer !== null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  /**
   * Safely evaluate a condition string like "clues >= 2" or "trust == true"
   */
  public evalCondition(conditionStr?: string): boolean {
    if (!conditionStr || conditionStr.trim() === '') return true;
    try {
      const keys = Object.keys(this.state.variables);
      const values = Object.values(this.state.variables);
      const fn = new Function(...keys, `"use strict"; return (${conditionStr});`);
      return Boolean(fn(...values));
    } catch (e) {
      console.warn(`Condition evaluation failed for "${conditionStr}":`, e);
      return false;
    }
  }

  public async autoSave() {
    if (!this.state.currentNode) return;
    await this.saveManager.save('auto', {
      currentNodeId: this.state.currentNode.id,
      variables: { ...this.state.variables },
      history: [...this.state.history],
      currentBgId: this.state.currentBgId,
      characters: [...this.state.characters],
    });
  }

  public async quickSave() {
    if (!this.state.currentNode) return;
    audioManager.playSound('click');
    await this.saveManager.save('quick', {
      currentNodeId: this.state.currentNode.id,
      variables: { ...this.state.variables },
      history: [...this.state.history],
      currentBgId: this.state.currentBgId,
      characters: [...this.state.characters],
    });
  }

  public async quickLoad() {
    const data = await this.saveManager.load('quick');
    if (data) {
      this.applySaveData(data);
    }
  }

  public applySaveData(data: SaveData) {
    this.clearTimers();
    this.snapshots = [];
    this.state.variables = { ...data.variables };
    this.state.history = [...data.history];
    this.state.currentBgId = data.currentBgId;
    this.state.characters = data.characters ? [...data.characters] : [];
    this.state.isAutoPlay = false;
    this.state.isSkipMode = false;
    this.state.isEnded = false;

    audioManager.playSound('transition');
    this.goToNode(data.currentNodeId, false);
  }
}
