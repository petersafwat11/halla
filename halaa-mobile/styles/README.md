# Design Tokens Documentation

This directory contains the global design system tokens exported from Figma and transformed into CSS custom properties.

## Files

- **`global.css`** - Main design tokens file with all CSS custom properties and utility classes

## Usage

### 1. Import in Your Project

For React Native Web or web-based projects, import the CSS file in your main entry point:

```javascript
// In App.js or index.js
import "./styles/global.css";
```

For React Native, you'll need to adapt these tokens to a JavaScript/TypeScript format. See the conversion section below.

### 2. Using CSS Custom Properties

You can reference any design token using the `var()` function:

```css
.my-component {
  background-color: var(--color-primary-500);
  padding: var(--space-16);
  border-radius: var(--radius-default);
  color: var(--text-title-black);
}
```

### 3. Using Utility Classes

The file includes pre-built utility classes for common use cases:

```html
<div class="bg-card-1 p-16 rounded-12 text-body-paragraph">Content here</div>
```

## Design Token Categories

### Colors

#### Natural (Grays)

- `--color-natural-50` to `--color-natural-900`
- Usage: Backgrounds, borders, text

#### Primary (Brand)

- `--color-primary-50` to `--color-primary-900`
- Usage: Brand colors, primary actions

#### Secondary

- `--color-secondary-50` to `--color-secondary-900`
- Usage: Secondary UI elements

#### Accent

- `--color-accent-50` to `--color-accent-900`
- Usage: Accent colors, highlights

#### Semantic Colors

- **Error**: `--color-error-50` to `--color-error-900`
- **Success**: `--color-success-50` to `--color-success-900`
- **Warning**: `--color-warning-50` to `--color-warning-900`

#### Opacity Colors

- **Black**: `--color-black-10` to `--color-black-100`
- **White**: `--color-white-10` to `--color-white-100`

### Button Tokens

Pre-configured button states for different variants:

#### Primary Button

```css
.btn-primary {
  background-color: var(--btn-primary-bg-active);
  color: var(--btn-primary-fg-active);
}

.btn-primary:hover {
  background-color: var(--btn-primary-bg-hover);
}

.btn-primary:active {
  background-color: var(--btn-primary-bg-pressed);
}

.btn-primary:focus {
  border-color: var(--btn-primary-border-focus);
}

.btn-primary:disabled {
  background-color: var(--btn-primary-bg-disabled);
  color: var(--btn-primary-fg-disabled);
}
```

Available button variants:

- `--btn-primary-*`
- `--btn-secondary-*`
- `--btn-outline-*`
- `--btn-transparent-*`
- `--btn-destructive-*`

### Form Field Tokens

Pre-configured form field states:

```css
.input-field {
  background-color: var(--form-bg-active);
  border-color: var(--form-border-active);
  color: var(--form-fg-filled);
}

.input-field:hover {
  background-color: var(--form-bg-hover);
  border-color: var(--form-border-hover);
}

.input-field:focus {
  border-color: var(--form-border-focused);
}

.input-field.error {
  background-color: var(--form-bg-error);
  border-color: var(--form-border-error);
  color: var(--form-fg-error);
}

.input-field:disabled {
  background-color: var(--form-bg-disabled);
  border-color: var(--form-border-disabled);
  color: var(--form-fg-disabled);
}
```

### Typography

#### Font Families

- `--font-family-english`: Inter (for English text)
- `--font-family-arabic`: Cairo (for Arabic text)

#### Font Sizes

Organized by scale:

- **Huge**: `--font-size-huge-xxlarge` (56px) to `--font-size-huge-small` (36px)
- **Display**: `--font-size-display-xxlarge` (56px) to `--font-size-display-small` (36px)
- **Headline**: `--font-size-headline-large` (32px) to `--font-size-headline-small` (24px)
- **Title**: `--font-size-title-large` (24px) to `--font-size-title-small` (14px)
- **Body**: `--font-size-body-large` (16px) to `--font-size-body-small` (12px)
- **Label**: `--font-size-label-large` (14px) to `--font-size-label-small` (11px)
- **Caption**: `--font-size-caption-large` (12px) to `--font-size-caption-small` (10px)

#### Font Weights

- `--font-weight-regular`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600

#### Line Heights

- `--line-height-0` (64px) to `--line-height-9` (16px)

#### Letter Spacing

- `--letter-spacing-default`: 0px
- `--letter-spacing-large`: 8px

### Spacing

Consistent spacing scale from 4px to 100px:

- `--space-4`, `--space-8`, `--space-12`, `--space-16`, `--space-20`, `--space-24`, etc.

Use for:

- Padding
- Margin
- Gap (flexbox/grid)

### Border Radius

- `--radius-4`: 4px
- `--radius-8`: 8px
- `--radius-12`: 12px (default)
- `--radius-16`: 16px
- `--radius-20`: 20px
- `--radius-default`: 12px

### Icon Sizes

- `--icon-size-xxlarge`: 40px
- `--icon-size-xlarge`: 32px
- `--icon-size-large`: 24px
- `--icon-size-medium`: 20px
- `--icon-size-small`: 16px
- `--icon-size-xsmall`: 12px

## Converting to React Native

For React Native projects, you'll need to convert CSS tokens to JavaScript. Here's a helper script:

### Create `styles/tokens.js`:

```javascript
export const colors = {
  natural: {
    50: "#ffffff",
    100: "#fdfdfd",
    150: "#f7f7f7",
    200: "#f2f2f2",
    250: "#dfdfdf",
    300: "#cacaca",
    350: "#a0a0a0",
    400: "#767676",
    450: "#656565",
    500: "#4c4c4c",
    700: "#454545",
    800: "#3d3d3d",
    900: "#2c2c2c",
  },
  primary: {
    50: "#f9f4ef",
    100: "#f5ece4",
    200: "#e3cbb4",
    300: "#d6b392",
    400: "#cea57d",
    500: "#c28e5c",
    600: "#b18154",
    700: "#8a6541",
    800: "#6b4e33",
    900: "#513c27",
  },
  // ... add other color scales
};

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  // ... add other spacing values
};

export const borderRadius = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  default: 12,
};

export const typography = {
  fontFamily: {
    english: "Inter",
    arabic: "Cairo",
  },
  fontSize: {
    headline: {
      large: 32,
      medium: 28,
      small: 24,
    },
    title: {
      large: 24,
      medium: 16,
      small: 14,
    },
    body: {
      large: 16,
      medium: 14,
      small: 12,
    },
    // ... add other font sizes
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
  },
  lineHeight: {
    0: 64,
    1: 52,
    2: 44,
    3: 40,
    4: 36,
    5: 32,
    6: 28,
    7: 24,
    8: 20,
    9: 16,
  },
};

export const iconSizes = {
  xxlarge: 40,
  xlarge: 32,
  large: 24,
  medium: 20,
  small: 16,
  xsmall: 12,
};
```

### Usage in React Native:

```javascript
import { colors, spacing, typography, borderRadius } from "./styles/tokens";

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary[500],
    padding: spacing[16],
    borderRadius: borderRadius.default,
  },
  title: {
    fontFamily: typography.fontFamily.english,
    fontSize: typography.fontSize.headline.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
});
```

## Best Practices

1. **Always use tokens instead of hardcoded values**

   ```css
   /* ❌ Bad */
   .button {
     background: #c28e5c;
     padding: 16px;
   }

   /* ✅ Good */
   .button {
     background: var(--color-primary-500);
     padding: var(--space-16);
   }
   ```

2. **Use semantic tokens for components**

   ```css
   /* ✅ Use button tokens for buttons */
   .button-primary {
     background-color: var(--btn-primary-bg-active);
     color: var(--btn-primary-fg-active);
   }

   /* ✅ Use form tokens for inputs */
   .input {
     background-color: var(--form-bg-active);
     border-color: var(--form-border-active);
   }
   ```

3. **Maintain consistency with spacing scale**

   ```css
   /* ✅ Use the spacing scale */
   .card {
     padding: var(--space-16);
     margin-bottom: var(--space-24);
     gap: var(--space-12);
   }
   ```

4. **Use text tokens for typography**

   ```css
   /* ✅ Use text color tokens */
   .heading {
     color: var(--text-title-brand);
   }

   .description {
     color: var(--text-body-description);
   }
   ```

## Updating Tokens

When the design system is updated in Figma:

1. Export the new `export.json` file from Figma
2. Run the transformation script (or manually update `global.css`)
3. Test all components to ensure compatibility
4. Update this documentation if new tokens are added

## Support

For questions or issues with the design tokens, contact the design team or refer to the Figma design system documentation.
