import React, { useState, useEffect } from 'react';
import { getLogoBase64 } from '../services/clientPdfService.ts';

export type LogoContext =
  | 'header'
  | 'auth'
  | 'letterhead'
  | 'verify'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl';

interface CompanyLogoProps {
  className?: string;
  size?: LogoContext;
  alt?: string;
  // Retained for backward compatibility
  showText?: boolean;
  inverted?: boolean;
  lightBackground?: boolean;
}

/**
 * CompanyLogo renders the official real artwork logo image of CORE LINK Administrative Services.
 * Preserves the exact aspect ratio (object-contain) and enforces strict max-height rules:
 * - Header/navigation bar: max height 40px
 * - Login/Register screen (AuthModal): max height 64px, centered with proper spacing
 * - Official Letterhead: max height 70px, positioned at top
 * - Verification page: max height 48px
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  size = 'header',
  alt = 'CORE LINK Administrative Services',
}) => {
  const [logoSrc, setLogoSrc] = useState<string>('/logo.png');

  useEffect(() => {
    let isMounted = true;
    getLogoBase64().then((uri) => {
      if (isMounted && uri) {
        setLogoSrc(uri);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const sizeMap: Record<LogoContext, string> = {
    header: 'max-h-[40px]',
    auth: 'max-h-[64px]',
    letterhead: 'max-h-[70px]',
    verify: 'max-h-[48px]',
    // Backward-compatible aliases
    sm: 'max-h-[32px]',
    md: 'max-h-[40px]',
    lg: 'max-h-[70px]',
    xl: 'max-h-[64px]',
  };

  const heightClass = sizeMap[size] || 'max-h-[40px]';

  const heightPxMap: Record<LogoContext, number> = {
    header: 40,
    auth: 64,
    letterhead: 65,
    verify: 48,
    sm: 32,
    md: 40,
    lg: 65,
    xl: 64,
  };
  const maxHPx = heightPxMap[size] || 40;

  return (
    <img
      src={logoSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      style={{
        maxHeight: `${maxHPx}px`,
        maxWidth: '220px',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
      }}
      className={`w-auto h-auto object-contain select-none ${heightClass} ${className}`}
    />
  );
};
