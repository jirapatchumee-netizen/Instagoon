/**
 * Builds the playable VNProject from games/overtime (game.json + scenes/*.json),
 * the single source of truth for story. Art comes from assets.json via artRegistry.
 */
import game from '../../games/overtime/game.json';
import {
  VNProject,
  StoryNode,
  CharacterDef,
  BackgroundDef,
  CharacterStagePlacement,
  CharacterPosition,
} from '@/schema/types';
import { OVERTIME_CHARACTERS } from './overtimeSecretsAssets';
import { bgSrc, hasRegistrySprites, spriteSrc } from './artRegistry';

interface RawOption { label: string; go: string }
interface RawNode {
  id: string;
  say?: string;
  cast?: string[];
  bg?: string;
  fx?: 'shake' | 'flash';
  text?: string;
  go?: string;
  choice?: string;
  options?: RawOption[];
  set?: Record<string, unknown>;
  end?: string;
  retry?: string;
}
interface RawScene { id: string; title: string; bg?: string; nodes: RawNode[] }

const sceneModules = import.meta.glob('../../games/overtime/scenes/*.json', { eager: true, import: 'default' }) as Record<string, RawScene>;

const gid = (scene: string, id: string) => (id.includes('/') ? id : `${scene}/${id}`);

const CAST_RE = /^([a-z_]+)(?::([a-z_]+))?@([a-z-]+)$/;

function parseCast(tokens: string[], speaker?: string): CharacterStagePlacement[] {
  return tokens.map((t) => {
    const m = CAST_RE.exec(t);
    if (!m) throw new Error(`Bad cast token "${t}"`);
    return {
      characterId: m[1],
      expression: m[2] ?? 'normal',
      position: m[3] as CharacterPosition,
      isSpeaking: m[1] === speaker,
    };
  });
}

function buildNodes(scenes: RawScene[]): Record<string, StoryNode> {
  const nodes: Record<string, StoryNode> = {};
  for (const scene of scenes) {
    scene.nodes.forEach((n, idx) => {
      const id = gid(scene.id, n.id);
      const nextRaw = n.go ?? scene.nodes[idx + 1]?.id;
      const next = nextRaw ? gid(scene.id, nextRaw) : undefined;
      const sets = Object.entries(n.set ?? {});
      const hasBody = Boolean(n.text || n.choice || n.end);
      const bodyId = sets.length && hasBody ? `${id}#body` : id;

      sets.forEach(([variableName, value], i) => {
        const last = i === sets.length - 1;
        const setId = i === 0 ? id : `${id}#set${i}`;
        nodes[setId] = {
          id: setId,
          type: 'set_variable',
          variableName,
          operation: 'set',
          value,
          nextId: last ? (hasBody ? bodyId : (next as string)) : `${id}#set${i + 1}`,
        };
      });

      if (!hasBody) return;

      if (n.choice) {
        nodes[bodyId] = {
          id: bodyId,
          type: 'choice',
          prompt: n.choice,
          options: (n.options ?? []).map((o, k) => ({ id: `${id}#o${k}`, label: o.label, targetNodeId: gid(scene.id, o.go) })),
        };
      } else if (n.end) {
        nodes[bodyId] = {
          id: bodyId,
          type: 'end',
          endingName: n.end,
          message: n.text,
          retryNodeId: n.retry ? gid(scene.id, n.retry) : undefined,
        };
      } else {
        nodes[bodyId] = {
          id: bodyId,
          type: 'dialogue',
          speakerId: n.say,
          text: n.text ?? '',
          backgroundId: n.bg ?? (idx === 0 ? scene.bg : undefined),
          characters: n.cast ? parseCast(n.cast, n.say) : undefined,
          cameraEffect: n.fx,
          nextId: next,
        };
      }
    });
  }
  return nodes;
}

function collectExpressions(scenes: RawScene[]): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const s of scenes) for (const n of s.nodes) for (const t of n.cast ?? []) {
    const m = CAST_RE.exec(t);
    if (m) (out[m[1]] ??= new Set(['normal'])).add(m[2] ?? 'normal');
  }
  return out;
}

export function loadOvertimeProject(): VNProject {
  const scenes = Object.entries(sceneModules).sort(([a], [b]) => a.localeCompare(b)).map(([, s]) => s);
  const exprs = collectExpressions(scenes);

  const characters: Record<string, CharacterDef> = {};
  for (const [id, c] of Object.entries(game.characters)) {
    const sprites: Record<string, string> = {};
    if (hasRegistrySprites(id)) for (const e of exprs[id] ?? ['normal']) sprites[e] = spriteSrc(id, e);
    else Object.assign(sprites, OVERTIME_CHARACTERS[id]?.sprites ?? {});
    characters[id] = { id, name: c.name, color: c.color, sprites };
  }

  const backgrounds: Record<string, BackgroundDef> = {};
  for (const [id, name] of Object.entries(game.backgrounds)) backgrounds[id] = { id, name: name as string, src: bgSrc(id) };

  return {
    id: game.id,
    meta: { title: game.title, author: game.author, version: game.version, description: game.description, resolution: { width: 544, height: 960 } },
    characters,
    backgrounds,
    audio: {},
    initialVariables: { ...game.variables },
    startNodeId: gid(game.startScene, game.startNode),
    nodes: buildNodes(scenes),
  };
}

export const OVERTIME_PROJECT = loadOvertimeProject();
