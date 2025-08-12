import emergentLogo from '../assets/emergent-logo.png';

interface EmergentLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function EmergentLogo({ size = 'md', showText = true, className = '' }: EmergentLogoProps) {
  const logoSizeClasses = {
    sm: 'h-8',
    md: 'h-10', 
    lg: 'h-12'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Your actual business logo */}
      <img 
        src={emergentLogo}
        alt="Emergent Intelligence Logo"
        className={`${logoSizeClasses[size]} w-auto object-contain`}
        style={{ 
          filter: 'brightness(1.1) contrast(1.1)', 
          imageRendering: 'crisp-edges' 
        }}
      />
      
      {showText && (
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight tracking-tight sr-only">
            EMERGENT INTELLIGENCE
          </h1>
        </div>
      )}
    </div>
  );
}