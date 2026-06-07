FRONTEND TASK: Include master_category_key in product update mutation payload

FILES TO READ FIRST:
- src/components/modals/ProductFormModal.tsx (full file)

CURRENT STATE:
- `ProductFormModal` already has `master_category_key` in the Zod schema, the useEffect sets it via `setValue`, and the Select input lets the user pick it
- BUT in `onSubmit` for the edit path (lines ~84–103), `master_category_key` is NOT included in the data sent to `updateMutation.mutateAsync()`
- This means the backend never receives the value and never saves it

IMPLEMENTATION SPEC:
In `onSubmit`, inside the `isEditing` block, add `master_category_key` to the data object passed to `updateMutation.mutateAsync`:

Change:
```typescript
await updateMutation.mutateAsync({
  id: product.id,
  data: {
    name: values.name,
    description: values.description,
    category: values.category,
    is_active: values.is_active,
    supplier_link: values.supplier_link || null,
    weight: values.weight ?? 0,
    length: values.length ?? 0,
    width: values.width ?? 0,
    height: values.height ?? 0,
  },
})
```

To:
```typescript
await updateMutation.mutateAsync({
  id: product.id,
  data: {
    name: values.name,
    description: values.description,
    category: values.category,
    master_category_key: values.master_category_key ?? '',
    is_active: values.is_active,
    supplier_link: values.supplier_link || null,
    weight: values.weight ?? 0,
    length: values.length ?? 0,
    width: values.width ?? 0,
    height: values.height ?? 0,
  },
})
```

That is the only change needed. Do not touch any other part of the file.

TESTS REQUIRED:
- No new test needed — this is a one-field addition to an existing payload. Existing tests cover the modal behavior.

CONVENTIONS:
- Double quotes, no trailing semicolons on type declarations
- No new comments

VALIDATION (all must pass):
- npm run type-check
- npm run lint

DO NOT COMMIT — the Orchestrator will commit together with the backend change.
