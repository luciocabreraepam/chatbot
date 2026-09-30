---
paths:
  - "apps/website/src/**/*.ts"
  - "apps/website/src/**/*.tsx"
---

# StyleX Rules

## Structure

- `stylex.create()` is **always at module scope**, never inside a component or hook.
- `stylex.props()` is called in the JSX return — spread its result onto the element:
  ```tsx
  <div {...stylex.props(styles.root, isActive && styles.active)} />
  ```
- Never use `style={{}}` inline overrides alongside StyleX. All visual state goes through style objects.

## Variants and dynamic styles

For components with multiple visual variants (size, color, orientation), group variant objects by concern and export them together. Apply the appropriate variant key via `stylex.props()`:

```typescript
// Button.stylex.ts
const colorVariants = stylex.create({
  primary: { backgroundColor: colors.brandPrimary },
  secondary: { backgroundColor: colors.backgroundSecondary },
});

const sizeVariants = stylex.create({
  lg: { padding: spacing.lg },
  md: { padding: spacing.md },
  sm: { padding: spacing.sm },
});

export const buttonStyles = {
  base: baseStyles.button,
  color: colorVariants,
  size: sizeVariants,
};

// Button.component.tsx
<button {...stylex.props(
  buttonStyles.base,
  buttonStyles.size[size],
  buttonStyles.color[color],
  customStylex,
)} />
```

Conditional styles within a single component use `&&` or ternary inside `stylex.props()` — not string concatenation or className toggling.

## Consumer style override prop

Expose `customStylex?: StyleXStyles` (not `style`) on every reusable component so callers can extend appearance without breaking encapsulation:

```tsx
import type { StyleXStyles } from "@stylexjs/stylex";

type CardProps = {
  readonly customStylex?: StyleXStyles;
};

export function Card({ customStylex }: CardProps) {
  return <div {...stylex.props(styles.root, customStylex)} />;
}
```

The name `customStylex` signals it is a StyleX-specific override and prevents confusion with the native `style` attribute.

## Tokens

### Defining tokens

Define design tokens with `stylex.defineVars()` in dedicated `*.stylex.ts` token files. Never hardcode colors, spacing, radius, or typography values.

```typescript
// tokens/base.stylex.ts
export const spacing = stylex.defineVars({
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
});

export const borderRadius = stylex.defineVars({
  sm: "4px",
  md: "8px",
  lg: "16px",
});
```

### Using tokens

Import tokens from `src/styles/tokens.stylex.ts` (or the design-system token files). To add a new token: define it in the token file first, then use it.

## File co-location

- Styles for a component live in the same file, **below the component definition**.
- If a component's styles exceed ~40 lines, extract to a sibling `ComponentName.stylex.ts` and import from there.
- Always use the `.ts` extension for style files (not `.tsx`) — they contain no JSX.

## What not to do

- No `className` string manipulation.
- No CSS Modules or plain CSS alongside StyleX in the same component.
- No `!important` — fix specificity by restructuring the style hierarchy.
- No `style={...}` inline props — always use `stylex.props()`.
- Never create anonymous inline functions in JSX event handlers (`onClick={() => handler()}`) — they create a new reference on every render and break memoization.
