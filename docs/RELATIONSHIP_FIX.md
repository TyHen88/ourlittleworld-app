# 🔗 Fixed Ambiguous Relationship Error

## Error Message
```json
{
    "code": "PGRST201",
    "message": "Could not embed because more than one relationship was found for 'profiles' and 'couples'"
}
```

## Problem

The `profiles` and `couples` tables have **3 foreign key relationships**:

1. `couples_partner_1_id_fkey` - couples → profiles (partner 1)
2. `couples_partner_2_id_fkey` - couples → profiles (partner 2)
3. `fk_profiles_couple` - profiles → couples (via couple_id)

When we query `profiles` with `couples(*)`, Supabase doesn't know which relationship to use!

---

## Solution

Specify the exact relationship using the `!` syntax:

### ❌ Before (Ambiguous):
```typescript
.select('*, couples(*)')
// Error: Which relationship? partner_1? partner_2? couple_id?
```

### ✅ After (Specific):
```typescript
.select('*, couples!fk_profiles_couple(*)')
// Clear: Use the couple_id relationship from profiles to couples
```

---

## What `fk_profiles_couple` Means

This is the foreign key constraint name that links:
- `profiles.couple_id` → `couples.id`

So when we query a profile, we get the couple that this profile belongs to (via their `couple_id`).

---

## Files Updated

### 1. `app/(app)/profile/page.tsx`
```typescript
// Line 47 - Loading profile
.select('*, couples!fk_profiles_couple(*)')

// Line 60 - Creating profile
.select('*, couples!fk_profiles_couple(*)')
```

### 2. `lib/actions/auth.ts`
```typescript
// Line 166 - getCurrentUser function
.select('*, couples!fk_profiles_couple(*)')
```

---

## Understanding the Relationships

### Relationship 1: `couples_partner_1_id_fkey`
```
couples.partner_1_id → profiles.id
(Which profile is partner 1?)
```

### Relationship 2: `couples_partner_2_id_fkey`
```
couples.partner_2_id → profiles.id
(Which profile is partner 2?)
```

### Relationship 3: `fk_profiles_couple` ✅ (We use this one)
```
profiles.couple_id → couples.id
(Which couple does this profile belong to?)
```

---

## Why This Relationship?

When loading a **profile**, we want to know:
- "What couple does this user belong to?"
- This is stored in `profiles.couple_id`
- So we use `fk_profiles_couple` relationship

If we were loading a **couple** and wanted to know the partners:
- We'd use `couples_partner_1_id_fkey` or `couples_partner_2_id_fkey`
- Example: `couples.select('*, profiles!couples_partner_1_id_fkey(*)')`

---

## Testing

### ✅ Profile Page
1. Login
2. Go to `/profile`
3. Should load without PGRST201 error
4. Couple info should display correctly

### ✅ Onboarding
1. Create or join a couple
2. Should work without errors
3. Couple data should save correctly

---

## Key Takeaway

When you have multiple foreign keys between tables, always specify which one to use:

```typescript
// Generic (may cause ambiguity)
.select('*, other_table(*)')

// Specific (always works)
.select('*, other_table!foreign_key_name(*)')
```

---

## ✅ Status: FIXED

All queries now explicitly specify the `fk_profiles_couple` relationship, eliminating the ambiguity error! 💕
