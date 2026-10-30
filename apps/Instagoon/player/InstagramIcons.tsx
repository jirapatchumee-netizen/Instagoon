import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// 1. Authentic instagoon Cursive Wordmark Logo
export const IgLogo: React.FC<IconProps> = ({ size = 104, className = '', ...props }) => (
  <svg
    viewBox="0 0 114 29"
    width={size}
    height={size * (29 / 114)}
    fill="currentColor"
    className={className}
    aria-label="instagoon"
    {...props}
  >
    <path d="M15.4 0C6.9 0 0 6.9 0 15.4c0 6.8 4.4 12.6 10.5 14.6-.8-1.5-1.2-3.3-1.2-5.1 0-6.4 5.2-11.5 11.5-11.5 1.8 0 3.5.4 5.1 1.2C23.9 6.5 20 0 15.4 0z" opacity="0" />
    {/* Clean stylized instagoon script lettering */}
    <text
      x="0"
      y="22"
      fontFamily="'Playfair Display', 'Brush Script MT', 'Grandista', cursive"
      fontStyle="italic"
      fontWeight="700"
      fontSize="25"
      letterSpacing="-0.5px"
      fill="currentColor"
    >
      instagoon
    </text>
  </svg>
);

// Google "G" mark for the sign-in button; its colours are fixed by Google's branding rules.
export const GoogleG: React.FC<IconProps> = ({ size = 20, className = '', ...props }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true" {...props}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

// 2. Official Instagram Heart (Outline & Filled)
export const IgHeart: React.FC<IconProps & { filled?: boolean }> = ({
  size = 24,
  filled = false,
  className = '',
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={filled ? '#ff3040' : 'none'}
    stroke={filled ? '#ff3040' : 'currentColor'}
    strokeWidth={filled ? '0' : '2'}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {filled ? (
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    ) : (
      <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.071 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z" strokeWidth="0" fill="currentColor" />
    )}
  </svg>
);

// 3. Official Instagram Comment Bubble (Rounded Speech Bubble)
export const IgComment: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
  </svg>
);

// 4. Official Instagram Paper Airplane (Share & DM)
export const IgShare: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="22" y1="2" x2="9.218" y2="10.083" />
    <polygon points="11.698 20.334 22 2 2 2 9.218 10.084 11.698 20.334" />
  </svg>
);

// 5. Official Instagram Bookmark / Ribbon (Outline & Filled)
export const IgBookmark: React.FC<IconProps & { filled?: boolean }> = ({
  size = 24,
  filled = false,
  className = '',
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polygon points="20 21 12 13.44 4 21 4 3 20 3 20 21" />
  </svg>
);

// 6. Official Instagram 3-Dots
export const IgMore: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
  </svg>
);

// 7. Official Instagram 8-Petal Rosette Blue Verified Badge
export const IgVerified: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    className={className}
    {...props}
  >
    <path
      d="M12 2l2.3 2.1 3-.7 1.3 2.8 3 .5.2 3.1 2.3 2.1-1.3 2.8 1.3 2.8-2.3 2.1-.2 3.1-3 .5-1.3 2.8-3-.7L12 22l-2.3-2.1-3 .7-1.3-2.8-3-.5-.2-3.1-2.3-2.1 1.3-2.8-1.3-2.8 2.3-2.1.2-3.1 3-.5 1.3-2.8 3 .7L12 2z"
      fill="#0095f6"
    />
    <path
      d="M9.5 12.5l2 2 4.5-5"
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 8. Instagram Navigation Home Icon
export const IgHome: React.FC<IconProps & { active?: boolean }> = ({
  size = 24,
  active = true,
  className = '',
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={active ? '0' : '2'}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {active ? (
      <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" />
    ) : (
      <path d="M9 22V12h6v10M2 10.5L12 3l10 7.5V22H2V10.5z" />
    )}
  </svg>
);

// 9. Instagram Search / Explore Icon
export const IgSearch: React.FC<IconProps & { active?: boolean }> = ({
  size = 24,
  active = false,
  className = '',
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? '2.8' : '2'}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z" />
    <line x1="16.511" y1="16.511" x2="22" y2="22" />
  </svg>
);

// 10. Instagram Plus / Create Icon
export const IgCreate: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

// 11. Instagram Reels Icon
export const IgReels: React.FC<IconProps & { active?: boolean }> = ({
  size = 24,
  active = false,
  className = '',
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="2" y="3" width="20" height="18" rx="5" />
    <path d="M9.5 8.5L16 12L9.5 15.5V8.5Z" fill={active ? 'currentColor' : 'none'} />
    <line x1="2" y1="8" x2="7" y2="3" />
    <line x1="17" y1="3" x2="22" y2="8" />
  </svg>
);

// 12. Audio Note Icon
export const IgAudio: React.FC<IconProps> = ({ size = 13, className = '', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);
