import { useState, useCallback } from 'react';

interface ContainerSizingOptions {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  step?: number;
  storageKey?: string; // For persistence
}

interface ContainerSizingResult {
  height: number;
  adjustHeight: (delta: number) => void;
  setHeight: (height: number) => void;
  resetHeight: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

/**
 * Custom hook for dynamic container sizing with controls
 * 
 * Features:
 * - Adjustable height with increment/decrement controls
 * - Min/max height constraints
 * - Optional localStorage persistence
 * - Boundary checks for controls
 * 
 * @param options Configuration options for the sizing behavior
 * @returns Object with height state and control functions
 */
export function useContainerSizing(options: ContainerSizingOptions = {}): ContainerSizingResult {
  const {
    initialHeight = 400,
    minHeight = 200,
    maxHeight = 800,
    step = 50,
    storageKey
  } = options;

  // Initialize height from localStorage if provided, otherwise use initial
  const getInitialHeight = useCallback(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? initialHeight : Math.max(minHeight, Math.min(maxHeight, parsed));
      }
    }
    return initialHeight;
  }, [initialHeight, minHeight, maxHeight, storageKey]);

  const [height, setHeightState] = useState<number>(getInitialHeight);

  // Update height with constraints and persistence
  const setHeight = useCallback((newHeight: number) => {
    const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    setHeightState(constrainedHeight);
    
    // Persist to localStorage if key provided
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, constrainedHeight.toString());
    }
  }, [minHeight, maxHeight, storageKey]);

  // Adjust height by delta amount
  const adjustHeight = useCallback((delta: number) => {
    setHeight(height + delta);
  }, [height, setHeight]);

  // Reset to initial height
  const resetHeight = useCallback(() => {
    setHeight(initialHeight);
  }, [initialHeight, setHeight]);

  // Boundary checks for UI controls
  const canIncrease = height < maxHeight;
  const canDecrease = height > minHeight;

  return {
    height,
    adjustHeight,
    setHeight,
    resetHeight,
    canIncrease,
    canDecrease
  };
}