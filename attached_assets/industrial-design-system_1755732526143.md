# SkyClaim Industrial Design System

## Overview
The SkyClaim Industrial Design System provides a comprehensive set of colors, fonts, and textures for creating a consistent "techno garage" aerospace aesthetic throughout the application.

## Files
- `client/src/styles/industrial-design-system.css` - Main design system file
- Automatically imported into `client/src/index.css`

## Color Palette

### Primary Industrial Colors
```css
--industrial-slate-900: hsl(215, 25%, 16%)  /* Darkest background */
--industrial-slate-800: hsl(215, 25%, 18%)  /* Dark background */
--industrial-slate-700: hsl(215, 25%, 20%)  /* Medium background */
--industrial-slate-600: hsl(215, 20%, 25%)  /* Light background */
--industrial-slate-500: hsl(215, 20%, 40%)  /* Medium text */
--industrial-slate-400: hsl(215, 20%, 60%)  /* Light text */
```

### Accent Colors
```css
--industrial-blue-600: hsl(217, 91%, 60%)   /* Primary blue */
--industrial-blue-500: hsl(217, 91%, 55%)   /* Medium blue */
--industrial-blue-400: hsl(217, 91%, 50%)   /* Dark blue */
--industrial-blue-300: hsl(217, 91%, 65%)   /* Light blue */
```

### Status Colors
```css
--industrial-green: hsl(158, 64%, 52%)      /* Success/Online */
--industrial-red: hsl(0, 84%, 60%)          /* Danger/Alert */
--industrial-amber: hsl(45, 96%, 53%)       /* Warning */
```

## Typography

### Font Classes
- `.font-industrial-mono` - Monospace font for technical displays
- `.font-industrial-display` - Display font for headings
- `.font-industrial-body` - Body text font

## Texture Patterns

### Background Textures
- `.hex-mesh-pattern` - Hexagonal mesh for premium sections
- `.carbon-fiber-weave` - Carbon fiber crosshatch for high-value cards
- `.fine-grid-mesh` - Technical grid for data sections and forms

## Components

### Buttons
- `.riveted-button` - Gray industrial button with corner rivets
- `.riveted-button-blue` - Blue industrial button with corner rivets

### Industrial Elements
- `.drone-camera-lens` - Realistic camera lens with blue LED center
- `.drone-hud-status` - Green HUD status indicator with pulsing LED
- `.damage-alert` - Red alert styling with animated warning indicators

### Cards and Inputs
- `.industrial-card` - Standard industrial card styling
- `.industrial-input` - Input field with industrial theme

## Utility Classes

### Text Colors
- `.text-industrial-primary` - White text
- `.text-industrial-secondary` - Light gray text
- `.text-industrial-muted` - Muted gray text
- `.text-industrial-accent` - Blue accent text
- `.text-industrial-success` - Green success text
- `.text-industrial-warning` - Amber warning text
- `.text-industrial-danger` - Red danger text

### Background Colors
- `.bg-industrial-dark` - Dark background
- `.bg-industrial-medium` - Medium background
- `.bg-industrial-light` - Light background

## Usage Examples

### Basic Industrial Card
```jsx
<div className="industrial-card hex-mesh-pattern p-6">
  <h3 className="font-industrial-display text-industrial-primary">Card Title</h3>
  <p className="font-industrial-body text-industrial-secondary">Card content</p>
</div>
```

### Riveted Button
```jsx
<button className="riveted-button px-4 py-2 rounded">
  Standard Action
</button>

<button className="riveted-button-blue px-4 py-2 rounded">
  Primary Action
</button>
```

### Drone Camera Element
```jsx
<div className="flex items-center gap-3">
  <div className="drone-camera-lens" style={{width: '48px', height: '48px'}}></div>
  <div className="drone-hud-status">
    <span>ONLINE</span>
  </div>
</div>
```

### Damage Alert
```jsx
<div className="damage-alert p-4">
  <h4 className="text-industrial-danger font-industrial-display">Storm Damage Detected</h4>
  <p className="text-industrial-secondary">Critical roof damage identified</p>
</div>
```

## Design Principles

1. **Aerospace Authenticity** - All elements should feel like they belong in a professional drone control center
2. **Industrial Hardware** - Buttons and interactive elements should feel like physical hardware with rivets and metal textures
3. **Technical Precision** - Use monospace fonts and precise measurements for technical data
4. **Visual Hierarchy** - Use textures and colors to guide user attention to important elements
5. **Mobile Optimization** - All elements are designed to work on mobile devices with appropriate touch targets

## Maintenance

When adding new components:
1. Use existing CSS custom properties for colors
2. Follow the established naming convention (`industrial-*`)
3. Include both light and dark state styling
4. Add appropriate hover and active states
5. Document new components in this file