interface EmergentLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function EmergentLogo({ size = 'md', showText = true, className = '' }: EmergentLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* EI Logo Icon - Stylized version matching the brand */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center relative overflow-hidden`}>
        {/* Dynamic lines effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse" />
        
        {/* EI Text */}
        <div className="relative z-10 font-bold text-slate-900 text-xs leading-none tracking-tight">
          EI
        </div>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-600/30 to-transparent rounded-lg" />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${textSizeClasses[size]} font-bold text-slate-900 dark:text-white leading-tight tracking-tight`}>
            EMERGENT
          </h1>
          <h2 className={`text-sm font-medium text-yellow-600 dark:text-yellow-400 leading-tight tracking-widest`}>
            INTELLIGENCE
          </h2>
        </div>
      )}
    </div>
  );
}