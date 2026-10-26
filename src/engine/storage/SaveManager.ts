/**
 * Storage & Save Management for Visual Novel
 * Uses IndexedDB (via idb-keyval) with LocalStorage fallback.
 */

import { get, set, del, keys } from 'idb-keyval';
import { SaveData, SaveMetadata } from '@/schema/types';

const SAVE_KEY_PREFIX = 'vn_save_';
const SETTINGS_KEY = 'vn_player_settings';

export class SaveManager {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  private getSlotKey(slotId: string): string {
    return `${SAVE_KEY_PREFIX}${this.projectId}_${slotId}`;
  }

  public async save(slotId: string, data: Omit<SaveData, 'slotId' | 'projectId' | 'timestamp'>): Promise<SaveMetadata> {
    const key = this.getSlotKey(slotId);
    const saveData: SaveData = {
      ...data,
      slotId,
      projectId: this.projectId,
      timestamp: Date.now(),
    };

    try {
      await set(key, saveData);
    } catch {
      // LocalStorage fallback
      try {
        localStorage.setItem(key, JSON.stringify(saveData));
      } catch (e) {
        console.error('Save failed:', e);
      }
    }

    const lastHistory = data.history[data.history.length - 1];
    const previewText = lastHistory ? `${lastHistory.speakerName ? lastHistory.speakerName + ': ' : ''}${lastHistory.text.slice(0, 40)}...` : 'Saved game';

    return {
      slotId,
      title: slotId === 'auto' ? 'Auto Save' : slotId === 'quick' ? 'Quick Save' : `Slot ${slotId}`,
      timestamp: saveData.timestamp,
      previewText,
      thumbnail: data.thumbnail,
    };
  }

  public async load(slotId: string): Promise<SaveData | null> {
    const key = this.getSlotKey(slotId);
    try {
      const data = await get<SaveData>(key);
      if (data) return data;
    } catch {}

    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        return JSON.parse(localData) as SaveData;
      } catch {}
    }
    return null;
  }

  public async delete(slotId: string): Promise<void> {
    const key = this.getSlotKey(slotId);
    try {
      await del(key);
    } catch {}
    localStorage.removeItem(key);
  }

  public async listSlots(): Promise<SaveMetadata[]> {
    const allSlots: SaveMetadata[] = [];
    const prefix = `${SAVE_KEY_PREFIX}${this.projectId}_`;

    try {
      const allKeys = await keys();
      for (const k of allKeys) {
        if (typeof k === 'string' && k.startsWith(prefix)) {
          const slotId = k.replace(prefix, '');
          const data = await get<SaveData>(k);
          if (data) {
            const lastHistory = data.history[data.history.length - 1];
            allSlots.push({
              slotId,
              title: slotId === 'auto' ? 'Auto Save' : slotId === 'quick' ? 'Quick Save' : `Slot ${slotId}`,
              timestamp: data.timestamp,
              previewText: lastHistory ? `${lastHistory.speakerName ? lastHistory.speakerName + ': ' : ''}${lastHistory.text.slice(0, 45)}...` : 'Saved state',
              thumbnail: data.thumbnail,
            });
          }
        }
      }
    } catch {
      // Fallback to localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const slotId = k.replace(prefix, '');
          try {
            const data = JSON.parse(localStorage.getItem(k)!) as SaveData;
            const lastHistory = data.history[data.history.length - 1];
            allSlots.push({
              slotId,
              title: slotId === 'auto' ? 'Auto Save' : slotId === 'quick' ? 'Quick Save' : `Slot ${slotId}`,
              timestamp: data.timestamp,
              previewText: lastHistory ? `${lastHistory.speakerName ? lastHistory.speakerName + ': ' : ''}${lastHistory.text.slice(0, 45)}...` : 'Saved state',
              thumbnail: data.thumbnail,
            });
          } catch {}
        }
      }
    }

    return allSlots.sort((a, b) => b.timestamp - a.timestamp);
  }

  public saveSettings(settings: any) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }

  public loadSettings(): any | null {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }
}
