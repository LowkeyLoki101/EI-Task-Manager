import emergentLogo from '@/assets/Emergent Intelligence Logo.svg';

interface EmergentLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function EmergentLogo({ size = 'md', showText = true, className = '' }: EmergentLogoProps) {
  const sizeClasses = {
    sm: { width: 32, height: 32, textSize: 'text-lg' },
    md: { width: 48, height: 48, textSize: 'text-xl' },
    lg: { width: 64, height: 64, textSize: 'text-2xl' }
  };

  const { width, height, textSize } = sizeClasses[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Official Emergent Intelligence Logo */}
      <div className="relative">
        <img 
          src={emergentLogo}
          alt="Emergent Intelligence Logo"
          width={width} 
          height={height}
          className="object-contain"
        />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <div className={`${textSize} font-bold text-gray-900 dark:text-white leading-tight tracking-wide`}>
            EMERGENT
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            INTELLIGENCE
          </div>
        </div>
      )}
    </div>
  );
}