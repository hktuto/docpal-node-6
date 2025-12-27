# ✅ Testing Checklist - Template System

**Date**: December 27, 2025  
**Goal**: Verify template creation and sample data import works perfectly

---

## 🚀 Quick Start

### 1. Reset & Seed Database

```bash
# Terminal 1: Make sure dev server is running
pnpm dev

# Terminal 2: Reset database
curl -X POST http://localhost:3000/api/db-reset

# Terminal 3: Seed templates
curl -X POST http://localhost:3000/api/seed
```

**Expected Output:**
```
✓ Created template: Advanced CRM
```

---

## 📋 Test Cases

### Test 1: Template Picker Accessibility ✅

**Steps:**
1. Navigate to: `http://localhost:3000/workspaces`
2. Look at header

**Expected:**
- [ ] See "From Template" button next to "Create New"
- [ ] Both buttons are visible
- [ ] Buttons are properly aligned

**Screenshot Location:**
```
┌────────────────────────────────────┐
│ My Workspaces  [From Template] [Create New] │
└────────────────────────────────────┘
```

---

### Test 2: Template Dialog ✅

**Steps:**
1. Click "From Template" button
2. Template picker dialog opens

**Expected:**
- [ ] Dialog appears with title "Choose a Template"
- [ ] Can see "Advanced CRM" template card
- [ ] Can search templates (search bar visible)
- [ ] Can see template description and tags

---

### Test 3: Create Workspace from Template ✅

**Steps:**
1. Click "Advanced CRM" template
2. Create dialog opens

**Expected:**
- [ ] Dialog title: "Create Workspace from Template"
- [ ] Name pre-filled: "Advanced CRM"
- [ ] Description pre-filled
- [ ] Icon selector NOT visible (template has icon)
- [ ] ☑ "Include sample data" checkbox visible and checked

---

### Test 4: Workspace Creation ✅

**Steps:**
1. Optionally change workspace name (e.g., "Test CRM")
2. Keep "Include sample data" checked
3. Click "Create App"
4. **Watch server console carefully!**

**Expected Server Logs:**
```
📊 Sample Data Config:
  - includeSampleData (from request): true
  - template.includesSampleData: true
  - shouldIncludeSampleData (final): true

🔍 Checking sample data for Companies:
  - shouldIncludeSampleData: true
  - has sampleData: true
  - sampleData length: 3

📊 Importing 3 sample rows for Companies...
  ✓ Inserted row with id: 019d1234-5678-7100-8000-000000000001
  ✓ Inserted row with id: 019d1234-5678-7100-8000-000000000002
  ✓ Inserted row with id: 019d1234-5678-7100-8000-000000000003
✅ Completed sample data import for Companies

🔍 Checking sample data for Contacts:
  - shouldIncludeSampleData: true
  - has sampleData: true
  - sampleData length: 3

📊 Importing 3 sample rows for Contacts...
  ✓ Inserted row with id: 019d1234-5678-7200-8000-000000000001
  ✓ Inserted row with id: 019d1234-5678-7200-8000-000000000002
  ✓ Inserted row with id: 019d1234-5678-7200-8000-000000000003
✅ Completed sample data import for Contacts

[... same for Deals and Activities ...]
```

**Expected UI:**
- [ ] Success message appears
- [ ] Navigates to new workspace
- [ ] URL changes to `/workspaces/test-crm` (or similar)

---

### Test 5: Menu Structure ✅

**Steps:**
1. Look at left sidebar menu

**Expected:**
- [ ] See 3 folders:
  - 📁 Sales & CRM
  - 📁 Activity & Engagement
  - 📁 Analytics & Insights
- [ ] All folders are EXPANDED by default
- [ ] Can see all tables inside folders:
  - Companies, Contacts, Deals (under Sales & CRM)
  - Activities (under Activity & Engagement)
  - Company Stats (under Analytics & Insights)

---

### Test 6: Sample Data - Companies ✅

**Steps:**
1. Click "Companies" in sidebar
2. View opens

**Expected:**
- [ ] See 3 rows:
  1. **Acme Corp**
     - Industry: Technology
     - Website: https://acme.example.com
     - Employee Count: 500
     - Annual Revenue: 50,000,000
     - Status: Customer
  
  2. **GlobalTech Solutions**
     - Industry: Technology
     - Website: https://globaltech.example.com
     - Employee Count: 1,200
     - Annual Revenue: 120,000,000
     - Status: Prospect
  
  3. **MediCare Plus**
     - Industry: Healthcare
     - Website: https://medicare.example.com
     - Employee Count: 800
     - Annual Revenue: 75,000,000
     - Status: Lead

---

### Test 7: Sample Data - Contacts ✅

**Steps:**
1. Click "Contacts" in sidebar

**Expected:**
- [ ] See 3 rows:
  1. **John Smith**
     - Email: john@acme.example.com
     - Phone: +1-555-0100
     - Job Title: CEO
     - Company: (should link to Acme Corp)
     - Is Primary: Yes
  
  2. **Sarah Johnson**
     - Email: sarah@acme.example.com
     - Phone: +1-555-0101
     - Job Title: CTO
     - Company: (should link to Acme Corp)
     - Is Primary: No
  
  3. **Michael Chen**
     - Email: michael@globaltech.example.com
     - Phone: +1-555-0200
     - Job Title: VP of Engineering
     - Company: (should link to GlobalTech)
     - Is Primary: Yes

---

### Test 8: Sample Data - Deals ✅

**Steps:**
1. Click "Deals" in sidebar

**Expected:**
- [ ] See 3 rows:
  1. **Acme Enterprise License**
     - Company: Acme Corp
     - Primary Contact: John Smith
     - Deal Value: $500,000
     - Stage: Negotiation
     - Probability: 75%
  
  2. **GlobalTech Integration Project**
     - Company: GlobalTech Solutions
     - Primary Contact: Michael Chen
     - Deal Value: $1,200,000
     - Stage: Proposal
     - Probability: 50%
  
  3. **MediCare Platform Upgrade**
     - Company: MediCare Plus
     - Deal Value: $750,000
     - Stage: Qualification
     - Probability: 30%

---

### Test 9: Sample Data - Activities ✅

**Steps:**
1. Click "Activities" in sidebar

**Expected:**
- [ ] See 3 rows:
  1. **Initial Discovery Call**
     - Type: Call
     - Related To: Company
     - Company: Acme Corp
     - Date: 2024-12-20
     - Duration: 45 minutes
  
  2. **Product Demo**
     - Type: Demo
     - Related To: Deal
     - Deal: Acme Enterprise License
     - Date: 2024-12-22
     - Duration: 60 minutes
  
  3. **Follow-up Email**
     - Type: Email
     - Related To: Contact
     - Contact: John Smith
     - Date: 2024-12-23

---

### Test 10: Relations Work ✅

**Steps:**
1. Open a Contact row
2. Check the "Company" field
3. Open a Deal row
4. Check "Company" and "Primary Contact" fields

**Expected:**
- [ ] Contact's company field shows linked company name
- [ ] Can click company to navigate to that row
- [ ] Deal's company and contact fields show linked data
- [ ] Relations are properly established

---

### Test 11: Create New Rows ✅

**Steps:**
1. In Companies table, click "Add Row"
2. Fill in data
3. Save

**Expected:**
- [ ] New row gets UUID v7 format
- [ ] Can see UUID starts with "019"
- [ ] All fields save correctly
- [ ] Row appears in table

---

### Test 12: Relation Selectors ✅

**Steps:**
1. In Contacts table, click "Add Row"
2. Try to select a Company

**Expected:**
- [ ] Company dropdown shows available companies
- [ ] Can select Acme Corp, GlobalTech, or MediCare
- [ ] Selection saves correctly
- [ ] Relation displays properly after save

---

## ❌ Common Issues & Fixes

### Issue: No Sample Data Appears

**Debug:**
```bash
# Check server logs for:
📊 Sample Data Config:
  - shouldIncludeSampleData: ???

# If false, checkbox wasn't checked or template not seeded
```

**Fix:**
1. Make sure checkbox is checked
2. Re-seed: `curl -X POST http://localhost:3000/api/seed`

---

### Issue: SQL Errors in Console

**Common Errors:**
- `invalid input syntax for type uuid` → UUID format issue
- `invalid input syntax for type json` → JSONB formatting issue
- `column does not exist` → Schema mismatch

**Fix:**
1. Reset DB: `curl -X POST http://localhost:3000/api/db-reset`
2. Re-seed: `curl -X POST http://localhost:3000/api/seed`
3. Try again

---

### Issue: Relations Don't Show Data

**Expected Behavior:**
- Relations show UUID in database
- UI should display linked record name
- This requires frontend relation rendering (may not be implemented yet)

**Workaround:**
- Check UUID is stored correctly
- Verify UUID matches a real row in target table

---

## 📊 Test Results Template

```markdown
## Test Results - [Your Name] - [Date]

### Environment
- Browser: [Chrome/Firefox/Safari]
- Database: [PostgreSQL version]
- Node: [version]

### Results
- [ ] Test 1: Template Picker - PASS/FAIL
- [ ] Test 2: Template Dialog - PASS/FAIL
- [ ] Test 3: Create Dialog - PASS/FAIL
- [ ] Test 4: Workspace Creation - PASS/FAIL
- [ ] Test 5: Menu Structure - PASS/FAIL
- [ ] Test 6: Companies Data - PASS/FAIL (X rows)
- [ ] Test 7: Contacts Data - PASS/FAIL (X rows)
- [ ] Test 8: Deals Data - PASS/FAIL (X rows)
- [ ] Test 9: Activities Data - PASS/FAIL (X rows)
- [ ] Test 10: Relations - PASS/FAIL
- [ ] Test 11: Create Rows - PASS/FAIL
- [ ] Test 12: Relation Selectors - PASS/FAIL

### Issues Found
1. [Description]
2. [Description]

### Server Logs
[Paste relevant server logs here]

### Screenshots
[Attach screenshots of any issues]
```

---

## ✅ Success Criteria

**All tests pass when:**
- ✅ Can create workspace from template
- ✅ Menu shows 3 folders (expanded)
- ✅ Companies has 3 rows with correct data
- ✅ Contacts has 3 rows with company links
- ✅ Deals has 3 rows with company + contact links
- ✅ Activities has 3 rows with relation links
- ✅ Can create new rows with relations
- ✅ No errors in server console
- ✅ UUIDs are v7 format (019...)

---

**Ready to test?** Start with the reset/seed commands above! 🚀

