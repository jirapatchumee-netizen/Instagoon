import { media } from '../ui';
import { initialCluster } from './format';

type Props = {
  name: string;
  color: string;
  artKey?: string | null;
  artState?: 'real' | 'pending';
  className?: string;
  label?: string;
};

// Tier A of the asset policy: no artwork yet means the creator's own brand colour,
// never an external placeholder service.
export function ArtTile({ name, color, artKey, artState = 'real', className = '', label }: Props) {
  if (artKey && artState !== 'pending') {
    return (
      <div className={'fs-h-art overflow-hidden ' + className}>
        <img src={media(artKey)} alt="" loading="lazy" className="h-full w-full object-cover object-[50%_18%]" />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={'fs-h-art relative flex items-center justify-center ' + className}
      style={{ ['--art-color' as string]: color }}
    >
      <span className="text-5xl font-bold text-white/85">{initialCluster(name)}</span>
      {label ? (
        <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/65 px-2 py-0.5 text-[10px] text-slate-200">
          {label}
        </span>
      ) : null}
    </div>
  );
}
