import type { CSSProperties } from 'react';
import type { NpcDefinition } from '../lib/npc/schema.ts';
import { assetUrl } from '../lib/client.ts';
export function Avatar({npc,large=false}:{npc:NpcDefinition;large?:boolean}) {return <span className={'avatar '+(large?'large':'')} style={{'--character-color':npc.color} as CSSProperties}>{npc.avatar?<img src={assetUrl(npc.avatar)} alt={npc.name}/>:<span className="monogram">{npc.name.slice(0,1)}</span>}</span>;}
