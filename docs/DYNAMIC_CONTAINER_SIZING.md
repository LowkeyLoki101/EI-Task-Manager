# Dynamic Container Sizing System

A comprehensive and reusable implementation for dynamic container height adjustment with visual controls, inspired by the Workstation component.

## Overview

This system provides three levels of implementation:
1. **Hook** (`useContainerSizing`) - Core logic for height management
2. **Controls Component** (`ContainerSizingControls`) - Reusable sizing buttons
3. **Complete Container** (`ResizableContainer`) - All-in-one solution

## Features

- **Dynamic Height Adjustment** - Increment/decrement controls with configurable steps
- **Constraint Management** - Min/max height boundaries with validation
- **Persistence** - Optional localStorage integration for user preferences
- **Accessibility** - Full keyboard support and ARIA labels
- **Customization** - Multiple styling variants and positioning options
- **Boundary Awareness** - Smart enable/disable of controls at limits

## Quick Start

### Simple Implementation
```tsx
import { ResizableContainer } from '@/components/ui/resizable-container';

function MyComponent() {
  return (
    <ResizableContainer
      initialHeight={400}
      minHeight={200}
      maxHeight={800}
      storageKey="my-container-height"
    >
      <div className="p-4">
        Your content here
      </div>
    </ResizableContainer>
  );
}
```

### Advanced Implementation with Header
```tsx
<ResizableContainer
  initialHeight={500}
  controlsPosition="header"
  controlsVariant="amber"
  showReset={true}
  storageKey="workstation-height"
  headerContent={
    <div className="flex items-center gap-2">
      <h3 className="font-medium">AI Workstation</h3>
      <Badge variant="outline">Active</Badge>
    </div>
  }
>
  {/* Your workstation content */}
</ResizableContainer>
```

## API Reference

### useContainerSizing Hook

```typescript
interface ContainerSizingOptions {
  initialHeight?: number;    // Default: 400
  minHeight?: number;        // Default: 200
  maxHeight?: number;        // Default: 800
  step?: number;            // Default: 50
  storageKey?: string;      // For localStorage persistence
}

interface ContainerSizingResult {
  height: number;
  adjustHeight: (delta: number) => void;
  setHeight: (height: number) => void;
  resetHeight: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}
```

**Example Usage:**
```tsx
function CustomPanel() {
  const { height, adjustHeight, canIncrease, canDecrease } = useContainerSizing({
    initialHeight: 300,
    minHeight: 150,
    maxHeight: 600,
    step: 25,
    storageKey: 'panel-height'
  });

  return (
    <div style={{ height: `${height}px` }} className="border rounded">
      {/* Your content */}
    </div>
  );
}
```

### ContainerSizingControls Component

```typescript
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
```

**Example Usage:**
```tsx
function CustomControls() {
  const sizing = useContainerSizing();
  
  return (
    <ContainerSizingControls
      onIncrease={() => sizing.adjustHeight(50)}
      onDecrease={() => sizing.adjustHeight(-50)}
      onReset={sizing.resetHeight}
      canIncrease={sizing.canIncrease}
      canDecrease={sizing.canDecrease}
      variant="amber"
      showReset={true}
      orientation="vertical"
    />
  );
}
```

### ResizableContainer Component

```typescript
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
```

## Implementation Examples

### Workstation-Style Panel
```tsx
function WorkstationPanel() {
  return (
    <ResizableContainer
      initialHeight={450}
      minHeight={200}
      maxHeight={800}
      step={50}
      storageKey="workstation-panel"
      controlsPosition="header"
      controlsVariant="amber"
      showReset={true}
      headerContent={
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="font-medium">AI Workstation</span>
        </div>
      }
      className="border border-amber-500/20 rounded-lg bg-slate-800/30"
    >
      <div className="p-4">
        {/* Workstation content */}
      </div>
    </ResizableContainer>
  );
}
```

### Chat Window
```tsx
function ChatWindow() {
  return (
    <ResizableContainer
      initialHeight={400}
      minHeight={200}
      maxHeight={600}
      storageKey="chat-height"
      controlsPosition="top-right"
      controlsVariant="ghost"
      className="border rounded-lg bg-background"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          {/* Chat messages */}
        </div>
        <div className="border-t p-3">
          {/* Message input */}
        </div>
      </div>
    </ResizableContainer>
  );
}
```

### Code Editor Panel
```tsx
function CodeEditor() {
  return (
    <ResizableContainer
      initialHeight={500}
      minHeight={300}
      maxHeight={1000}
      step={75}
      storageKey="editor-height"
      controlsPosition="header"
      showReset={true}
      headerContent={
        <div className="flex items-center justify-between w-full">
          <span className="font-mono text-sm">editor.tsx</span>
          <Badge variant="secondary">TypeScript</Badge>
        </div>
      }
    >
      <textarea 
        className="w-full h-full font-mono text-sm p-4 resize-none"
        placeholder="// Start coding..."
      />
    </ResizableContainer>
  );
}
```

## Styling Variants

### Amber Theme (Workstation Style)
```tsx
<ResizableContainer
  controlsVariant="amber"
  className="bg-slate-800/30 border border-amber-500/20"
  controlsClassName="border-amber-500/20"
>
  {/* Content */}
</ResizableContainer>
```

### Ghost Theme (Minimal)
```tsx
<ResizableContainer
  controlsVariant="ghost"
  controlsPosition="top-right"
  className="border border-border"
>
  {/* Content */}
</ResizableContainer>
```

### Dark Theme
```tsx
<ResizableContainer
  className="bg-gray-900 border border-gray-700 text-white"
  controlsClassName="text-gray-400"
>
  {/* Content */}
</ResizableContainer>
```

## Accessibility Features

- **Keyboard Navigation** - All controls accessible via keyboard
- **Screen Reader Support** - Proper ARIA labels and descriptions
- **Focus Management** - Clear focus indicators
- **Button States** - Disabled states when at boundaries
- **Tooltips** - Helpful hover text for controls

## Best Practices

1. **Choose Appropriate Constraints** - Set min/max heights that make sense for your content
2. **Use Storage Keys** - Provide `storageKey` for persistent user preferences
3. **Consider Context** - Choose control positioning that doesn't interfere with content
4. **Test Boundaries** - Ensure your content works well at min/max heights
5. **Provide Feedback** - Use tooltips or visual cues to guide users

## Integration with Existing Components

### Adding to Knowledge Base
```tsx
import { ResizableContainer } from '@/components/ui/resizable-container';

function KnowledgeBasePanel() {
  return (
    <ResizableContainer
      initialHeight={500}
      storageKey="knowledge-base-height"
      controlsPosition="header"
      headerContent={<h2>Knowledge Base</h2>}
    >
      <KnowledgeBaseManager sessionId={sessionId} />
    </ResizableContainer>
  );
}
```

### Wrapping Existing Components
```tsx
// Before
<div className="h-96 border">
  <MyComponent />
</div>

// After
<ResizableContainer 
  initialHeight={384} // 96 * 4 = 384px
  className="border"
>
  <MyComponent />
</ResizableContainer>
```

This implementation provides a robust, reusable solution for any component that benefits from user-controlled sizing, maintaining the excellent UX found in the original Workstation component.