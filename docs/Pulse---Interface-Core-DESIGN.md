---
version: "alpha"
name: "Pulse - Interface Core"
description: "Pulse Interface Background Effect is designed for delivering a visual treatment or immersive background effect. Key features include atmospheric visuals, motion depth, and flexible presentation layering. It is suitable for visual-first pages, motion studies, and atmospheric hero treatments."
colors:
  primary: "#FF6A55"
  secondary: "#8B5CF6"
  tertiary: "#F43F5E"
  neutral: "#F4F1EA"
  background: "#09090E"
  surface: "#0A0A10"
  text-primary: "#F4F1EA"
  text-secondary: "#A9A3B5"
  border: "#FFFFFF"
  accent: "#FF6A55"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "120px"
    fontWeight: 400
    lineHeight: "120px"
    letterSpacing: "-0.05em"
  body-md:
    fontFamily: "Inter"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0.1em"
  label-md:
    fontFamily: "Inter"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "1.5px"
rounded:
  sm: "13px"
  lg: "16px"
spacing:
  base: "5px"
  sm: "1px"
  md: "5px"
  lg: "9.6px"
  xl: "10px"
  gap: "10px"
  section-padding: "30px"
components:
  button-primary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "12.5px"
  button-secondary:
    backgroundColor: "{colors.border}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: "17.5px"
  button-link:
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-md}"
    rounded: "0px"
    padding: "0px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses light mode with #FF6A55 as the main accent and #F4F1EA as the neutral foundation.

- **Primary (#FF6A55):** Main accent and emphasis color.
- **Secondary (#8B5CF6):** Supporting accent for secondary emphasis.
- **Tertiary (#F43F5E):** Reserved accent for supporting contrast moments.
- **Neutral (#F4F1EA):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #09090E; Surface: #0A0A10; Text Primary: #F4F1EA; Text Secondary: #A9A3B5; Border: #FFFFFF; Accent: #FF6A55

- **Gradients:** bg-gradient-to-r from-[var(--text)] to-[var(--violet)] via-[var(--coral)]

## Typography

Typography relies on Inter across display, body, and utility text.

- **Display (`display-lg`):** Inter, 120px, weight 400, line-height 120px, letter-spacing -0.05em.
- **Body (`body-md`):** Inter, 15px, weight 500, line-height 20px, letter-spacing 0.1em.
- **Labels (`label-md`):** Inter, 15px, weight 500, line-height 20px, letter-spacing 1.5px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, full bleed structural frame before changing ornament or component styling. Use 5px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 5px
- **Scale:** 1px, 5px, 9.6px, 10px, 12.5px, 15px, 17.5px, 20px
- **Section padding:** 30px
- **Gaps:** 10px, 15px, 20px, 40px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF; 1px #E5E7EB
- **Shadows:** rgba(0, 0, 0, 0.45) 0px 30px 80px 0px, rgba(139, 92, 246, 0.12) 0px 0px 70px 0px, rgba(255, 255, 255, 0.08) 0px 1px 0px 0px inset; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px; rgba(139, 92, 246, 0.4) 0px 20px 35px -14px
- **Blur:** 12px, 24px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 1px padding and a 16px radius. Drive the shell with linear-gradient(135deg, rgba(255, 106, 85, 0.75), rgba(139, 92, 246, 0.75), rgba(245, 184, 91, 0.5)) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 13px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 13px, 14px, 16px, 18px, 999px, 9999px
- **Icon treatment:** Duotone
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #09090E, text #F4F1EA, radius 13px, padding 12.5px, border 0px solid rgb(229, 231, 235).
- **Secondary:** background #FFFFFF, text #A9A3B5, radius 16px, padding 17.5px, border 1px solid rgba(255, 255, 255, 0.1).
- **Links:** text #A9A3B5, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Iconography
- **Treatment:** Duotone.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 5px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 13px, 14px, 16px, 18px, 999px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 200ms and 150ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on text and color changes.

**Motion Level:** moderate

**Durations:** 200ms, 150ms

**Easings:** ease, cubic-bezier(0.4, 0, 0.2, 1)

**Hover Patterns:** text, color, stroke

## WebGL

Reconstruct the graphics as a ambient background using alpha, custom shaders. The effect should read as technical, meditative, and atmospheric: fine line lattice with black and sparse spacing. Build it from line trails + sparse anchors so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** WebGL

**Insights:**
  - **Scene:**
    - **Value:** Ambient background
  - **Effect:**
    - **Value:** Fine line lattice
  - **Primitives:**
    - **Value:** Line trails + sparse anchors
  - **Motion:**
    - **Value:** Slow breathing pulse
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** alpha, custom shaders

**Techniques:** Perspective grid, Line lattice, Breathing pulse, Pointer parallax, Shader gradients

**Code Evidence:**
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      import { Renderer, Program, Mesh, Triangle } from 'https://esm.sh/ogl@1.0.11';
      import gsap from 'https://esm.sh/gsap@3.12.5';

      // --- Mask Reveal Animation ---
      document.addEventListener('DOMContentLoaded', () => {
          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      ```
