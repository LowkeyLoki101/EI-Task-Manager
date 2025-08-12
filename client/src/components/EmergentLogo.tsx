interface EmergentLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function EmergentLogo({ size = 'md', showText = true, className = '' }: EmergentLogoProps) {
  const iconSizeClasses = {
    sm: 'w-8 h-6',
    md: 'w-10 h-8', 
    lg: 'w-12 h-10'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Stylized E/E Logo Icon - Modern geometric design */}
      <div className={`${iconSizeClasses[size]} flex items-center justify-center relative`}>
        <svg 
          viewBox="0 0 40 32" 
          className="w-full h-full"
          fill="none"
        >
          {/* First E */}
          <path 
            d="M2 2h12v4H6v6h6v4H6v6h8v4H2V2z" 
            fill="currentColor" 
            className="text-slate-800 dark:text-white"
          />
          {/* Divider line */}
          <path 
            d="M18 4h2v24h-2V4z" 
            fill="currentColor" 
            className="text-emerald-500 dark:text-emerald-400"
          />
          {/* Second E */}
          <path 
            d="M26 2h12v4h-8v6h6v4h-6v6h8v4H26V2z" 
            fill="currentColor" 
            className="text-slate-800 dark:text-white"
          />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${textSizeClasses[size]} font-bold text-slate-800 dark:text-white leading-tight tracking-tight`}>
            EMERGENT
          </h1>
          <h2 className={`text-xs font-medium text-emerald-500 dark:text-emerald-400 leading-tight tracking-[0.2em] uppercase`}>
            INTELLIGENCE
          </h2>
        </div>
      )}
    </div>
  );
}