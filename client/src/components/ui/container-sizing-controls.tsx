import { Button } from "@/components/ui/button";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContainerSizingControlsProps {
  onIncrease: () => void;
  onDecrease: () => void;
  onReset?: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
  className?: string;
  variant?: 'default' | 'amber' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showReset?: boolean;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Reusable container sizing controls component
 * 
 * Provides increment/decrement buttons for dynamic container resizing
 * with customizable styling and optional reset functionality.
 */
export function ContainerSizingControls({
  onIncrease,
  onDecrease,
  onReset,
  canIncrease,
  canDecrease,
  className,
  variant = 'default',
  size = 'sm',
  showReset = false,
  step = 50,
  orientation = 'horizontal'
}: ContainerSizingControlsProps) {
  
  // Variant-specific styling
  const variantClasses = {
    default: "text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800",
    amber: "text-amber-400 hover:text-amber-300 hover:bg-amber-900/20",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted"
  };

  // Size-specific styling
  const sizeClasses = {
    sm: "h-7 w-7 p-0",
    md: "h-8 w-8 p-0", 
    lg: "h-9 w-9 p-0"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  const buttonClasses = cn(
    variantClasses[variant],
    sizeClasses[size],
    "transition-colors"
  );

  const containerClasses = cn(
    "flex items-center gap-1",
    orientation === 'vertical' && "flex-col",
    className
  );

  return (
    <div className={containerClasses} data-testid="container-sizing-controls">
      {/* Decrease Button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onDecrease}
        disabled={!canDecrease}
        className={buttonClasses}
        title={`Decrease height by ${step}px`}
        data-testid="button-decrease-height"
      >
        <Minus className={iconSizes[size]} />
      </Button>

      {/* Increase Button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onIncrease}
        disabled={!canIncrease}
        className={buttonClasses}
        title={`Increase height by ${step}px`}
        data-testid="button-increase-height"
      >
        <Plus className={iconSizes[size]} />
      </Button>

      {/* Reset Button (Optional) */}
      {showReset && onReset && (
        <>
          <div className={cn(
            "border-l border-current opacity-20",
            orientation === 'vertical' ? "border-t border-l-0 h-0 w-2" : "h-4 w-0 mx-1"
          )} />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onReset}
            className={buttonClasses}
            title="Reset to default height"
            data-testid="button-reset-height"
          >
            <RotateCcw className={iconSizes[size]} />
          </Button>
        </>
      )}
    </div>
  );
}