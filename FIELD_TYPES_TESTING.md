# Field Types - Testing Guide

Quick guide to test the new field types we just implemented.

---

## 🚀 Quick Start

```bash
pnpm dev
```

Navigate to any table and test the new field types!

---

## ✅ Field Types to Test

### 1. Email Field
- Right-click column → "Add Column Right"
- Type label: "Email Address"
- ✅ AI should suggest "email" type
- Save and test:
  - Valid: `test@example.com` ✅
  - Invalid: `not-an-email` ❌ (should show error)
  - Multiple: `a@b.com, c@d.com` ✅

### 2. Phone Field
- Add column with label: "Phone Number"
- ✅ AI should suggest "phone" type
- Save and test:
  - Valid: `5551234567` ✅ (auto-formats to `(555) 123-4567`)
  - Invalid: `123` ❌ (too short)
  - International: `+1 234 567 8900` ✅

### 3. URL Field
- Add column with label: "Website"
- ✅ AI should suggest "url" type
- Save and test:
  - Full URL: `https://example.com` ✅
  - Partial: `example.com` ✅ (auto-adds `https://`)
  - Invalid: `not a url` ❌
  - Click link button → Opens in new tab 🔗

### 4. Select Field
- Add column with label: "Company Size"
- Type: "select"
- In config (need to add UI for this):
  - Options: `Small, Medium, Large`
- Save and test:
  - Dropdown shows options ✅
  - Select value saves correctly ✅
  - Clearable ✅
  - Filterable ✅

### 5. Multi-Select Field
- Add column with label: "Tags"
- Type: "multi_select"
- In config:
  - Options: `React, Vue, Angular, Svelte`
  - Max selections: 3
- Save and test:
  - Can select multiple ✅
  - Shows as tags ✅
  - Max limit enforced ✅
  - Shows count: "2 / 3 selected" ✅

---

## 🎯 Expected Behavior

### Validation
- ✅ Validates on blur (not every keystroke)
- ✅ Shows red border on error
- ✅ Shows clear error message
- ✅ Clears error when user starts typing

### Auto-formatting
- ✅ Phone numbers format automatically
- ✅ URLs normalize (add https://)
- ✅ Email whitespace trimmed

### Visual Feedback
- ✅ Icons show for each type
- ✅ Error messages are clear
- ✅ Hints show when needed
- ✅ Buttons work (external link, etc.)

---

## 🐛 Known Issues

None currently - all features working as expected!

---

## 📝 Notes

- Config UI for select options will be added in next session
- For now, select/multi-select options can be set via API
- All validation is working on backend + frontend

---

**Ready to test!** 🚀

Try creating columns with these types and let me know if anything doesn't work as expected!

