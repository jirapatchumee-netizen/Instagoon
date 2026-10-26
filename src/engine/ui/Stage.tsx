import React from 'react';
import { CharacterStagePlacement, CharacterDef, BackgroundDef } from '@/schema/types';

interface StageProps {
  currentBg?: BackgroundDef;
  characters: CharacterStagePlacement[];
  characterDefs: Record<string, CharacterDef>;
  cameraEffect?: 'shake' | 'flash' | 'zoom' | 'none';
  onClick?: () => void;
}

export const Stage: React.FC<StageProps> = ({
  currentBg,
  characters,
  characterDefs,
  cameraEffect = 'none',
  onClick,
}) => {
  const getPositionClass = (pos: string) => {
    switch (pos) {
      case 'far-left':
        return 'left-[5%]';
      case 'left':
        return 'left-[18%]';
      case 'center':
        return 'left-[50%] -translate-x-1/2';
      case 'right':
        return 'right-[18%]';
      case 'far-right':
        return 'right-[5%]';
      default:
        return 'left-[50%] -translate-x-1/2';
    }
  };

  const getAnimationClass = (anim?: string) => {
    switch (anim) {
      case 'bounce':
        return 'animate-bounce';
      case 'shake':
        return 'animate-shake';
      case 'fade-in':
        return 'animate-fadeIn';
      default:
        return '';
    }
  };

  const getCameraClass = () => {
    switch (cameraEffect) {
      case 'shake':
        return 'animate-shake';
      case 'flash':
        return 'brightness-150 transition-all duration-200';
      case 'zoom':
        return 'scale-105 transition-transform duration-500';
      default:
        return '';
    }
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-black cursor-pointer ${getCameraClass()}`}
      onClick={onClick}
    >
      {/* Background Layer with Smooth Fade */}
      {currentBg && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out"
          style={{ backgroundImage: `url("${currentBg.src}")` }}
        />
      )}

      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-black/20 to-black/60" />

      {/* Characters Stage Layer (1st-Person POV: Exclude Arm) */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
        {characters
          .filter((p) => p.characterId !== 'arm')
          .map((placement, index, filtered) => {
            const charDef = characterDefs[placement.characterId];
            if (!charDef) return null;

            const spriteSrc = charDef.sprites[placement.expression] || Object.values(charDef.sprites)[0];
            const isSpeaking = placement.isSpeaking ?? false;

            // In vertical 9:16 POV mode, if solo character, place at center
            const position = filtered.length === 1 ? 'center' : placement.position;

            return (
              <div
                key={`${placement.characterId}-${index}`}
                className={`absolute bottom-0 h-[80%] max-h-[920px] transition-all duration-500 ease-out flex flex-col justify-end ${getPositionClass(
                  position
                )} ${getAnimationClass(placement.animation)}`}
                style={{
                  zIndex: isSpeaking ? 20 : 10,
                  filter: isSpeaking ? 'brightness(1.05) drop-shadow(0 10px 25px rgba(0,0,0,0.7))' : 'brightness(0.7) blur(0.3px)',
                  transform: isSpeaking ? 'scale(1.02)' : 'scale(0.98)',
                }}
              >
                {spriteSrc && (
                  <img
                    src={spriteSrc}
                    alt={charDef.name}
                    className="h-full w-auto object-contain object-bottom pointer-events-none"
                    draggable={false}
                  />
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
