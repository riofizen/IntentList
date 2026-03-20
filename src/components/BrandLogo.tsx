import React from 'react';
import logoSrc from '../../logo main.PNG';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  imgClassName = '',
  alt = 'IntentList logo',
}) => {
  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`.trim()}>
      <img
        src={logoSrc}
        alt={alt}
        draggable={false}
        className={`h-full w-full object-contain scale-[1.6] origin-center ${imgClassName}`.trim()}
      />
    </div>
  );
};
