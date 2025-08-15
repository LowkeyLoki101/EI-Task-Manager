import { ReactNode } from 'react';
import { useContainerSizing } from '@/hooks/useContainerSizing';
import { ContainerSizingControls } from './container-sizing-controls';
import { cn } from '@/lib/utils';

interface ResizableContainerProps {
  children: ReactNode;
  className?: string;
  controlsClassName?: string;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  step?: number;
  storageKey?: string;
  showControls?: boolean;
  controlsPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'header';
  controlsVariant?: 'default' | 'amber' | 'ghost';
  showReset?: boolean;
  headerContent?: ReactNode;
  'data-testid'?: string;
}

/**
 * Complete resizable container component with built-in sizing controls
 * 
 * Features:
 * - Dynamic height adjustment with visual controls
 * - Configurable constraints and persistence
 * - Multiple control positioning options
 * - Optional header with custom content
 * - Fully customizable styling
 */
export function ResizableContainer({
  children,
  className,
  controlsClassName,
  initialHeight = 400,
  minHeight = 200,
  maxHeight = 800,
  step = 50,
  storageKey,
  showControls = true,
  controlsPosition = 'top-right',
  controlsVariant = 'default',
  showReset = false,
  headerContent,
  'data-testid': testId = 'resizable-container'
}: ResizableContainerProps) {
  
  const {
    height,
    adjustHeight,
    resetHeight,
    canIncrease,
    canDecrease
  } = useContainerSizing({
    initialHeight,
    minHeight,
    maxHeight,
    step,
    storageKey
  });

  const handleIncrease = () => adjustHeight(step);
  const handleDecrease = () => adjustHeight(-step);

  const controls = showControls ? (
    <ContainerSizingControls
      onIncrease={handleIncrease}
      onDecrease={handleDecrease}
      onReset={showReset ? resetHeight : undefined}
      canIncrease={canIncrease}
      canDecrease={canDecrease}
      variant={controlsVariant}
      showReset={showReset}
      step={step}
      className={controlsClassName}
    />
  ) : null;

  // Position controls based on configuration
  const positionClasses = {
    'top-right': 'absolute top-2 right-2 z-10',
    'top-left': 'absolute top-2 left-2 z-10',
    'bottom-right': 'absolute bottom-2 right-2 z-10',
    'bottom-left': 'absolute bottom-2 left-2 z-10',
    'header': '' // Controls will be placed in header
  };

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ height: `${height}px` }}
      data-testid={testId}
    >
      {/* Header with optional content and controls */}
      {(headerContent || controlsPosition === 'header') && (
        <div className="flex items-center justify-between p-2 border-b border-border bg-background/50">
          <div className="flex-1">
            {headerContent}
          </div>
          {controlsPosition === 'header' && (
            <div className="flex items-center gap-2">
              {controls}
            </div>
          )}
        </div>
      )}

      {/* Positioned controls (non-header) */}
      {showControls && controlsPosition !== 'header' && (
        <div className={positionClasses[controlsPosition]}>
          {controls}
        </div>
      )}

      {/* Main content area */}
      <div className={cn(
        "w-full overflow-auto",
        headerContent || controlsPosition === 'header' ? "h-[calc(100%-theme(spacing.12))]" : "h-full"
      )}>
        {children}
      </div>
    </div>
  );
}