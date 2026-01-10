WF2 Schema Notes

- raw_payload keys must match `lib/intake/schema/gaDivorceCustodyV1.ts` exactly.
- UI labels may differ from storage keys; only enum values are stored.
- System-only fields (`isSystem: true`) must never be client-editable and must not gate submission.
