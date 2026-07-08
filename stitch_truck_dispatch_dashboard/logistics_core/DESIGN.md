---
name: Logistics Core
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#44474d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#75777e'
  outline-variant: '#c5c6cd'
  surface-tint: '#515f78'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0d1c32'
  on-primary-container: '#76849f'
  inverse-primary: '#b9c7e4'
  secondary: '#a04100'
  on-secondary: '#ffffff'
  secondary-container: '#fe6b00'
  on-secondary-container: '#572000'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001356'
  on-tertiary-container: '#5979ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#ffdbcc'
  secondary-fixed-dim: '#ffb693'
  on-secondary-fixed: '#351000'
  on-secondary-fixed-variant: '#7a3000'
  tertiary-fixed: '#dde1ff'
  tertiary-fixed-dim: '#b8c3ff'
  on-tertiary-fixed: '#001356'
  on-tertiary-fixed-variant: '#0035be'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 24px
  gutter: 20px
  card-padding: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for high-stakes logistics and dispatch environments. It prioritizes **efficiency, reliability, and precision**. The aesthetic is **Corporate Modern**, leaning into high-density information display while maintaining a clean, approachable interface. 

The primary emotional response is one of **command and control**. By using deep, grounding tones contrasted with high-visibility action colors, the UI ensures that dispatchers can monitor fleet status at a glance without cognitive fatigue. The visual language is structured and architectural, emphasizing clear hierarchies and logical groupings.

## Colors

The palette is designed for maximum clarity in data-heavy dashboard environments.

- **Primary (Deep Navy):** Reserved for structural elements like sidebars, navigation headers, and primary headings. It provides a serious, stable foundation.
- **Secondary (Energetic Orange):** Used exclusively for primary Call-to-Actions (CTAs), critical alerts, and "active" status indicators. Its high visibility ensures important tasks are never missed.
- **Tertiary (Action Blue):** Employed for secondary actions, text links, and informational badges to distinguish them from the high-priority orange elements.
- **Background & Surfaces:** A tiered neutral system using white (#ffffff) for card surfaces and a light gray (#f8f9fa) for the application background to create subtle but effective separation.
- **Status Tones:** Success (Green #27ae60), Warning (Yellow #f2c94c), and Danger (Red #eb5757) are used for shipment statuses and system alerts.

## Typography

This design system utilizes **Inter** across all levels to leverage its exceptional legibility and systematic feel. 

- **Hierarchy:** High contrast in font weight (Bold for headers vs. Regular for body) ensures users can scan shipment IDs and metrics quickly.
- **Data Display:** For tabular data and tracking numbers, we utilize a slightly tighter tracking and medium weight (`data-mono`) to maximize information density without sacrificing readability.
- **Mobile Scaling:** Headlines scale down by 20% on mobile devices, while body text remains consistent at 14px-16px to ensure accessibility in the field for drivers.

## Layout & Spacing

The system employs a **Fluid Grid** model with strict container constraints for dashboard views.

- **Grid:** A 12-column system is used for desktop. Metrics cards typically span 3 columns, while primary data tables and maps span 8-9 columns or the full width.
- **Density:** We utilize a "Generous Utility" spacing philosophy. Large margins (24px) surround major UI sections to prevent the interface from feeling cluttered, while internal component spacing remains tight (8px-16px) to keep related data points grouped.
- **Responsive Behavior:** 
  - **Desktop:** Sidebar is fixed at 260px; content is fluid.
  - **Tablet:** Sidebar collapses to icons only; 2-column card layouts.
  - **Mobile:** Single column vertical stack; horizontal scrolling for data tables.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

- **Level 0 (Background):** The base neutral gray (#f8f9fa).
- **Level 1 (Cards/Surfaces):** Pure white (#ffffff) with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)). This lifts data containers off the background.
- **Level 2 (Active/Hover):** Interactive elements use a more pronounced shadow (0px 8px 24px rgba(0,0,0,0.1)) to indicate state changes.
- **Outlines:** Low-contrast borders (1px solid #e9ecef) are used on input fields and table rows to provide structure without adding visual noise.

## Shapes

The shape language is defined by **Soft Professionalism**. 

- **Primary Radius (8px - 12px):** Used for standard buttons, input fields, and small UI widgets.
- **Container Radius (16px):** Used for large dashboard cards and modal windows to create a modern, high-end feel.
- **Pill (100px):** Exclusively reserved for status chips (e.g., "In Transit", "Delivered") and global search bars to differentiate them from functional buttons.

## Components

### Buttons
- **Primary:** Orange background (#ff6b00), white text, 12px radius. High emphasis.
- **Secondary:** Transparent with Navy border or subtle Blue text. Medium emphasis.
- **Ghost:** No border, Navy or Blue text, used for utility actions in tables.

### Cards
- **Metric Cards:** Large headline for numbers, label-md for descriptions, and small trend indicators (green/red) at the bottom right.
- **Map Cards:** Full-bleed map views with a 16px internal padding for floating controls.

### Data Tables
- **Header:** Light gray background (#f1f3f5), uppercase label-lg typography.
- **Rows:** White background, 1px bottom border, hover state changes background to a very faint blue tint.
- **Cells:** High-contrast navy text for primary identifiers (IDs); muted gray for secondary info (timestamps).

### Input Fields
- White background, 1px gray border, 8px radius. 
- Active state: 2px Primary Navy or Blue border with a soft outer glow.

### Navigation (Sidebar)
- Dark Navy background. 
- Active state: Left-side accent bar (Orange) and a subtle background highlight for the menu item.
- Icons: Linear, 24px, consistent stroke weight.