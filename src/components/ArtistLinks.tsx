import React from 'react';

interface ArtistLinksProps {
  artists: string;
  onSelectArtist?: (artistName: string) => void;
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
}

export const ArtistLinks: React.FC<ArtistLinksProps> = ({
  artists,
  onSelectArtist,
  className = '',
  linkClassName = 'hover:underline hover:text-white cursor-pointer transition-colors',
  separatorClassName = 'text-zinc-500 font-normal',
}) => {
  if (!artists) return null;

  // Split multiple artists delimited by commas
  const parts = artists.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    return <span className={className}>{artists}</span>;
  }

  return (
    <span className={className} title={artists}>
      {parts.map((art, idx) => (
        <React.Fragment key={`${art}-${idx}`}>
          {idx > 0 && <span className={separatorClassName}>, </span>}
          {onSelectArtist ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelectArtist(art);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onSelectArtist(art);
                }
              }}
              className={linkClassName}
            >
              {art}
            </span>
          ) : (
            <span>{art}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
};
