import React, { useState } from 'react';
import { SALAM_APPLE_TOUCH_BASE64 } from '../assets/logoBase64';

interface LogoProps {
  className?: string;
  size?: number;
  showTitle?: boolean;
  customLogoUrl?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 64, showTitle = false, customLogoUrl }) => {
  const [imgError, setImgError] = useState(false);
  const logoToUse = customLogoUrl && customLogoUrl.trim() !== '' ? customLogoUrl : '/logo-salam.png';

  const handleImgError = () => {
    if (!imgError) {
      setImgError(true);
    }
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div 
        style={{ width: size, height: size }} 
        className="relative flex items-center justify-center transition-transform hover:scale-105"
      >
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-amber-400/80 bg-gradient-to-b from-[#2d0e0e] to-[#120505] p-0.5 shadow-[0_4px_15px_rgba(251,191,36,0.4)] flex items-center justify-center">
          <img 
            src={imgError ? SALAM_APPLE_TOUCH_BASE64 : logoToUse} 
            alt="شعار فريق السلام بكثيبة" 
            onError={handleImgError} 
            className="w-full h-full object-cover rounded-full transition-transform duration-300 hover:scale-105" 
            loading="eager"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {showTitle && (
        <div className="text-center mt-2">
          <h1 className="text-lg font-bold text-red-500 tracking-wide">فريق السلام بكثيبة</h1>
          <p className="text-xs text-amber-400 font-semibold">صقور الريف - غيل باوزير</p>
        </div>
      )}
    </div>
  );
};
