interface EmergentLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function EmergentLogo({ size = 'md', showText = true, className = '' }: EmergentLogoProps) {
  const sizeClasses = {
    sm: { width: 32, height: 32, textSize: 'text-lg' },
    md: { width: 40, height: 40, textSize: 'text-xl' },
    lg: { width: 48, height: 48, textSize: 'text-2xl' }
  };

  const { width, height, textSize } = sizeClasses[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Professional EMERGENT INTELLIGENCE Logo - Transparent Background */}
      <div className="relative">
        <svg 
          width={width} 
          height={height} 
          viewBox="0 0 100 100" 
          className="text-gray-900 dark:text-white"
          fill="none"
        >
          {/* Modern Letter E Design with Transparent Background */}
          <g stroke="currentColor" strokeWidth="2.5" fill="none">
            {/* Clean, geometric E */}
            <path 
              d="M25 25 L25 75 M25 25 L60 25 M25 50 L55 50 M25 75 L60 75" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            
            {/* Modern accent elements */}
            <path 
              d="M65 30 L75 40 L65 50 Z" 
              fill="currentColor" 
              opacity="0.8"
            />
            <circle 
              cx="75" 
              cy="65" 
              r="3" 
              fill="currentColor" 
              opacity="0.6"
            />
            
            {/* Connecting elements for "intelligence" theme */}
            <path 
              d="M60 25 L65 30 M55 50 L65 45 M60 75 L70 70" 
              strokeWidth="1.5" 
              opacity="0.4"
            />
          </g>
          
          {/* Subtle pulse animation for "emergent" concept */}
          <circle 
            cx="75" 
            cy="40" 
            r="6" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1" 
            opacity="0.15"
          >
            <animate 
              attributeName="r" 
              values="6;9;6" 
              dur="4s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="opacity" 
              values="0.15;0.05;0.15" 
              dur="4s" 
              repeatCount="indefinite" 
            />
          </circle>
        </svg>
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