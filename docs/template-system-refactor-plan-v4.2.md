# Template System Refactor Plan — v4.2 (Patch Only)

> **Status:** Planning only. No implementation files have been changed.
> **Supersedes:** Patches A, B, C listed below into `template-system-refactor-plan-v4.1.md`.
> **All other sections of v4.1 are unchanged and remain authoritative.**

---

## Changelog from v4.1 → v4.2

| # | Patch | Section(s) affected |
|---|-------|---------------------|
| A | Multi-select categories: use `SearchableSelect` (wrapped in `<Controller>`) | A-4 discovery table, Section D FieldConfigPanel inventory |
| B | `useBeforeUnload` replaced with custom `useUnsavedChanges` hook (no new deps) | Section D Save Flow |
| C | `ColorPickerGroup` `options` prop documented as boolean flag | A-4 discovery table |

---

## Patch A — Multi-select Categories

### Finding

Codebase search of `labbe/ui/`, `labbe/components/`, and `labbe/app/**/inputs/` found **one existing multi-select-capable component**:

| Component | Path | Multi-select | RHF Integration |
|---|---|---|---|
| `SearchableSelect` | `labbe/ui/commen/inputs/SearchableSelect/SearchableSelect.jsx` | YES — `multiple={true}` | **None** — pure controlled component (`value` + `onChange`). No `useFormContext` import. |
| `CheckBoxItems` | `labbe/ui/commen/inputs/checkboxItems/CheckBoxItems.js` | YES — checkbox grid | YES — `useFormContext()` + `watch` + `setValue`. Uses `items` prop (not `options`). |

Neither component is an `InputSelect`-style dropdown multi-select. `SearchableSelect` is the closest match: a searchable dropdown that supports multiple selection with a checked-item count display.

### Resolution: (a) — Existing component found

**Use `SearchableSelect` with `multiple={true}`, wrapped in a `<Controller>`.**

`SearchableSelect` does NOT use `useFormContext` internally; wrapping it in `<Controller>` is explicitly permitted by Section 8.7 (the forbidden-pattern rule applies only to components that already use `useFormContext` internally).

### A-4 Discovery Table — New Row (Web)

Add to the Web Component Discovery Table in Section A-4:

| Component | Path | RHF Integration | Multi-select props | Emits | Notes |
|---|---|---|---|---|---|
| `SearchableSelect` | `labbe/ui/commen/inputs/SearchableSelect/SearchableSelect.jsx` | **Controlled via `<Controller>`** — no internal RHF hooks | `multiple={true}`, `options={[{value, label}]}`, `value={string[] | []}`, `onChange={(arr) => void}` | `string[]` when `multiple={true}` | Searchable dropdown. `allOption` prop adds a "Select All" entry. Displays "N محدد" count when >1 selected. |

### FieldConfigPanel — Categories Control (replaces v4.1 row)

Replace the Categories row in Section D FieldConfigPanel Component Inventory:

| Panel Control | Existing Component | Props to pass |
|---|---|---|
| Categories (multi-select) | **`SearchableSelect`** (wrapped in `<Controller>`) | `multiple={true}`, `name="categories"`, `options={categoryOptions}`, `value={field.value \|\| []}`, `onChange={field.onChange}` |

### Categories field in admin editor — RHF wiring

```jsx
// Inside FieldConfigPanel.jsx (descendant of FormProvider from TemplateEditorPage.jsx)
import { useFormContext, Controller } from "react-hook-form";
import SearchableSelect from "@/ui/commen/inputs/SearchableSelect/SearchableSelect";

// In the panel JSX:
<Controller
  name="categories"
  control={control}
  defaultValue={[]}
  render={({ field }) => (
    <SearchableSelect
      multiple={true}
      options={categoryOptions}         // [{value: string, label: string}] from GET /api/templates/categories
      value={field.value ?? []}
      onChange={field.onChange}
      label={t("admin.templates.fields.categories")}
      placeholder={t("admin.templates.fields.categoriesPlaceholder")}
    />
  )}
/>
```

`control` is obtained from `const { control } = useFormContext()` inside `FieldConfigPanel.jsx`, which is a descendant of the `FormProvider` in `TemplateEditorPage.jsx`.

---

## Patch B — `useBeforeUnload` Replacement

### Finding

- `react-use`: **NOT installed** in `labbe/package.json`.
- `react-router-dom`: **NOT installed**.
- Framework: **Next.js 15.5.9** (App Router). The Pages-Router `router.events.on("routeChangeStart", ...)` API is **not available** in the App Router.

### Resolution — Custom `useUnsavedChanges` hook (zero new dependencies)

Create `labbe/hooks/useUnsavedChanges.js`:

```js
// labbe/hooks/useUnsavedChanges.js
"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Guards against accidental navigation when a form has unsaved changes.
 *
 * Covers two cases:
 *   1. Browser-level navigation (tab close, F5, address-bar entry) — handled via
 *      the window `beforeunload` event.
 *   2. In-app SPA navigation (Next.js router.push / Link clicks) — handled by
 *      monkey-patching window.history.pushState and replaceState, which is the
 *      underlying mechanism Next.js App Router uses for soft navigations.
 *
 * When `isDirty` is false the hook is a no-op.
 */
export function useUnsavedChanges(isDirty, message) {
  const msg = message ?? "You have unsaved changes. Are you sure you want to leave?";
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync so the history patch closure always reads the latest value.
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Case 1: browser navigation (tab close / F5 / address bar).
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e) => {
      e.preventDefault();
      // Chrome requires returnValue to be set; modern browsers show their own
      // message and ignore this string, but it must be non-empty.
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, msg]);

  // Case 2: in-app SPA navigation via Next.js App Router.
  // Monkey-patch history.pushState / replaceState once on mount.
  // The patch reads isDirtyRef.current at call time, so it always reflects the
  // latest form state without needing to re-patch on every render.
  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    const guard = (original) => function (...args) {
      if (isDirtyRef.current) {
        // eslint-disable-next-line no-alert
        const ok = window.confirm(msg);
        if (!ok) return;
      }
      return original(...args);
    };

    window.history.pushState    = guard(originalPush);
    window.history.replaceState = guard(originalReplace);

    return () => {
      window.history.pushState    = originalPush;
      window.history.replaceState = originalReplace;
    };
    // Run once on mount; isDirtyRef stays current via the earlier effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
```

### Updated Save Flow code block (replaces v4.1 Section D Save Flow snippet)

```js
// TemplateEditorPage.jsx
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

// Inside TemplateEditorPage component:
const { formState } = useFormContext();
useUnsavedChanges(formState.isDirty, t("admin.templates.editor.unsavedChangesWarning"));
```

Remove the stale import line from v4.1:

```js
// DELETE THIS LINE — react-router-dom is not installed and doesn't apply to Next.js App Router:
// import { useBeforeUnload } from "react-router-dom";
```

### Required locale key (add to Section H-2, namespace `admin.json`)

| Key | English value | Arabic value |
|---|---|---|
| `admin.templates.editor.unsavedChangesWarning` | `"You have unsaved changes. Are you sure you want to leave?"` | `"لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد المغادرة؟"` |

---

## Patch C — `ColorPickerGroup` `options` Prop

### Finding

Read `labbe/ui/commen/inputs/inputGroup/ColorPickerGroup.js`:

```js
const ColorPickerGroup = ({
  label,
  name,
  value,
  onChange,
  customColorPlaceholder,
  options,   // ← this prop
})
```

`options` is a **boolean flag**. When truthy it renders a row of 12 hardcoded preset color swatches:

```js
{options && (
  <div className={styles.color_options}>
    {colorOptions.map((color) => ( /* swatch button */ ))}
  </div>
)}
```

The hardcoded preset palette (internal to the component, not configurable via `options`):
```
#c28e5c  #d6b392  #8b6f47  #a0845c  #e74c3c  #3498db
#2ecc71  #f39c12  #9b59b6  #1abc9c  #34495e  #95a5a6
```

When `options` is falsy, only the custom color picker input and hex text input are shown.

### Resolution — No renderField change required

The renderField in v4.1 Section E already passes `options={true}`, which is correct — it enables the preset palette for the host. **No change to the renderField code.**

### A-4 Discovery Table — Update ColorPickerGroup row

Update the `options` entry in the Web Component Discovery Table, `ColorPickerGroup` row:

| Column | Updated value |
|---|---|
| Supports Props | `label`, `name`, `value`, `onChange`, `customColorPlaceholder`, `options` (`boolean` — `true` shows 12 hardcoded preset swatches; `false`/omitted shows only custom input) |
| Missing Props → Resolution | None — `options={true}` in renderField is correct |

> **Note**: `options` is NOT an array of preset colors. The preset palette is hardcoded inside the component. Passing `options={true}` simply toggles their visibility. Do not pass an array — it will have no effect and will be ignored by the component.

---

## Implementation Note for Section F

The following steps in Section F are affected by these patches:

| Section F Step | Change |
|---|---|
| Step 10 (Extend InputGroup / TextArea) | No change — patches A/B/C don't affect this step. |
| Step 12 (Host StepThree, TemplateForm) | `renderField` `color` case: keep `options={true}` as-is (Patch C confirms it is correct). |
| Step 13 (Admin templates UI) | Categories control: use `SearchableSelect` in `<Controller>` instead of `InputSelect` (Patch A). Install no additional npm package — `SearchableSelect` already exists. Create `labbe/hooks/useUnsavedChanges.js` (Patch B). |

No new npm packages are required by any of these patches.
