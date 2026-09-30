---
description: Scaffold a new shared React component with StyleX styles and a Vitest test. Use when asked to create a reusable UI component.
---

Scaffold a new shared component for: $ARGUMENTS

## Steps

1. **Determine location**: shared components live in `apps/website/src/components/<ComponentName>/`.

2. **Create `<ComponentName>.types.ts`**:

```typescript
import type { StyleXStyles } from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef } from 'react';

// Extend native element props and omit any you redefine.
// Use ComponentPropsWithRef if the component forwards a ref.
export type <ComponentName>Props = Omit<
  ComponentPropsWithoutRef<'div'>, // swap 'div' for the actual root element
  never // list any overridden props here
> & {
  readonly customStylex?: StyleXStyles; // always include for caller overrides
  // TODO: add props — all properties must be readonly
};
```

3. **Create `<ComponentName>.stylex.ts`**:

```typescript
import * as stylex from "@stylexjs/stylex";

// Group variants by concern; apply the right key in the component.
export const styles = stylex.create({
  root: {
    // TODO: base styles — use tokens from src/styles/tokens.stylex.ts, never hardcode values
  },
});
```

4. **Create `<ComponentName>.component.tsx`**:

```tsx
import * as stylex from '@stylexjs/stylex';
import { styles } from './<ComponentName>.stylex';
import type { <ComponentName>Props } from './<ComponentName>.types';

export const <ComponentName> = ({ customStylex, ...rest }: <ComponentName>Props) => {
  return (
    <div {...rest} {...stylex.props(styles.root, customStylex)}>
      {/* TODO */}
    </div>
  );
};
```

Key rules:

- Named export, never default
- `readonly` on every prop property
- `customStylex?: StyleXStyles` (not `style`) so callers can extend appearance via StyleX
- Extend `ComponentPropsWithoutRef` so callers get native HTML attributes for free
- No data fetching — pure presentational

5. **Create `<ComponentName>.test.tsx`**:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { <ComponentName> } from './<ComponentName>.component';

describe('<ComponentName>', () => {
  it('renders', () => {
    render(<ComponentName />);
    // TODO: assert on visible output — query by role/label/text, not by class
  });
});
```

6. **Create `index.ts`** (barrel — public API only):

```typescript
export { <ComponentName> } from './<ComponentName>.component';
export type { <ComponentName>Props } from './<ComponentName>.types';
```

7. **Check SOLID**:
   - Single responsibility: does the component do exactly one thing?
   - If it accepts more than ~4 props beyond `customStylex` and native HTML attrs, consider splitting it.
   - All type properties are `readonly` — enforce immutability at the type level.

8. Report the files created and any prop TODOs left for the user.
