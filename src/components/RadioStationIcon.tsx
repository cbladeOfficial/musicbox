import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRadio } from '@fortawesome/free-solid-svg-icons';

interface RadioStationIconProps {
  favicon?: string;
  name: string;
  className?: string;
  iconClassName?: string;
  containerClassName?: string;
}

export const RadioStationIcon: React.FC<RadioStationIconProps> = ({
  favicon,
  name,
  className = 'w-full h-full object-cover',
  iconClassName = 'text-[var(--accent-color)] text-lg',
  containerClassName = 'w-full h-full flex items-center justify-center bg-zinc-900/90',
}) => {
  const [hasError, setHasError] = useState(false);

  if (favicon && favicon.trim() && !hasError) {
    return (
      <img
        src={favicon}
        alt={name}
        loading="lazy"
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={containerClassName}>
      <FontAwesomeIcon icon={faRadio} className={iconClassName} />
    </div>
  );
};
