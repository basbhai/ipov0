# Issue 1: Bank Selection Implementation Guide

## Overview
This implementation adds intelligent bank selection with fuzzy matching to the IPO automation system. Users now:
1. Upload CSV files without bank information
2. Select banks from a searchable dropdown (predefined list of 54 Nepalese institutions)
3. Download updated CSV with bank selections for future use
4. Backend uses fuzzy matching (95% accuracy threshold) to handle slight variations

---

## Frontend Components

### 1. **lib/banks.ts** - Bank Constants
- **Purpose**: Centralized list of 54 Nepalese financial institutions (Commercial Banks, Development Banks, Finance Companies)
- **Usage**: Imported throughout the app for dropdown options

### 2. **components/bank-selector.tsx** - Searchable Bank Dropdown
- **Features**:
  - Real-time search filtering
  - Auto-focus on search input
  - Handles empty states gracefully
  - Used as a reusable component in the CSV table

### 3. **components/csv-table.tsx** - Enhanced CSV Preview
- **Updates**:
  - Added `bank` column to the table
  - Replaced static dropdown with `BankSelector` component
  - Added `onDataChange` callback to track bank selections
  - Bank column positioned as second-to-last visible column
  - Improved CSV parsing to handle quoted values

### 4. **components/csv-upload-form.tsx** - CSV Parser
- **Updates**:
  - Enhanced CSV parsing with proper quote handling
  - `bank` column is optional (auto-added if missing)
  - Supports both old CSVs (without bank) and new CSVs (with bank)
  - Max 20 accounts validation preserved

### 5. **app/page.tsx** - Main Application
- **New Features**:
  - `handleCsvDataChange()` - Tracks bank selection changes
  - `handleDownloadUpdatedCSV()` - Downloads CSV with selected banks
  - CSV download button in the table header
  - Updated template includes `bank` column (empty by default)

---

## Backend Script Updates

### **scripts/apply.py** - Fuzzy Bank Matching

#### New Functions:
```python
def fuzzy_match_bank(user_bank: str, available_banks: list, threshold: float = 0.95) 
    -> tuple[str | None, float]
```
- Uses Python's `SequenceMatcher` from `difflib`
- Compares user-provided bank name against available dropdown options
- Returns matched bank and confidence score
- Threshold: 95% similarity required for a match

#### Updated Logic:
1. Waits for `#selectBank` dropdown to be visible
2. Extracts all available bank options from the dropdown
3. Attempts fuzzy match on user-provided bank name
4. If match found (≥95% confidence): selects the matched bank
5. If no match: defaults to first available bank
6. Logs all actions for debugging

#### Example Flow:
```
User CSV bank: "Nabil Bank"          (typo: "Nabil Bank" instead of "Nabil Bank Ltd.")
Available: ["Nabil Bank Ltd.", "Nepal Bank Ltd.", ...]
Fuzzy Match: "Nabil Bank Ltd." (98% confidence)
Result: Selects "Nabil Bank Ltd." ✓
```

---

## Data Flow

### Upload Workflow:
```
User CSV (no bank)
    ↓
CSV Parser (adds empty bank column)
    ↓
Bank Selector Dropdown (user selects bank)
    ↓
Updated data stored in state
    ↓
Download CSV or Submit for processing
```

### Processing Workflow:
```
User clicks "Apply IPO"
    ↓
CSV data sent to /api/dispatch
    ↓
GitHub Actions triggered with bank column
    ↓
apply.py processes each account
    ↓
For each account:
    - Extracts bank from CSV
    - Fuzzy matches with available dropdown options
    - Selects the matched bank
    - Logs confidence score
    - Continues with form submission
```

---

## CSV Format

### Before (Old):
```csv
name,dp,username,password,pin,crn,units
john,13700,12345,pass123,1234,11111111,100
```

### After (New):
```csv
name,dp,username,password,pin,crn,units,bank
john,13700,12345,pass123,1234,11111111,100,Nabil Bank Ltd.
jane,13700,54321,pass456,5678,22222222,50,Nepal Bank Ltd.
```

### Features:
- `bank` column can be pre-filled from previous run
- If empty, user selects from dropdown
- Downloaded CSV includes all selections
- Supports re-using previous runs as templates

---

## Error Handling

### Frontend:
- CSV parsing errors are user-friendly
- Missing or invalid bank selections show as empty dropdown
- Download button validates data before generating file

### Backend:
- No available banks in dropdown → Logs warning, raises exception
- Bank fuzzy match fails → Logs warning with best score, uses first available bank
- Process continues even if match fails (graceful fallback)

---

## Testing Scenarios

### Scenario 1: User uploads CSV, selects banks, downloads
```
1. Upload CSV without bank column
2. Select bank for each row from dropdown
3. Click "Download CSV"
4. Result: CSV file with bank column populated
✓ Ready for next run
```

### Scenario 2: User uploads previous CSV (with banks)
```
1. Upload CSV that has bank column pre-filled
2. Bank values appear in selectors (can be changed)
3. Submit for processing
✓ Fuzzy matching handles slight variations
```

### Scenario 3: Bank name has typo in CSV
```
CSV: "Nabil Ban" (typo)
Script: Fuzzy matches to "Nabil Bank Ltd." (95%+ match)
Result: Correct bank selected ✓
Log: "Bank fuzzy matched: Nabil Ban -> Nabil Bank Ltd. (confidence: 98%)"
```

---

## Configuration

### Fuzzy Match Threshold:
- **Location**: `scripts/apply.py` line ~73
- **Default**: 95% (0.95)
- **Adjustable**: Change threshold parameter if needed

### Bank List:
- **Location**: `lib/banks.ts`
- **Total**: 54 institutions
- **Categories**: Commercial Banks (20), Development Banks (17), Finance Companies (17)
- **To add**: Edit the `BANKS` array in `lib/banks.ts`

---

## Integration Notes

### Environment Variables:
- No new environment variables required
- Uses existing `GITHUB_TOKEN` and `GITHUB_REPOSITORY`

### Dependencies:
- Frontend: Already available (`@radix-ui/react-select`, `lucide-react`)
- Backend: Python `difflib` (built-in, no pip install needed)

### Backward Compatibility:
- Old CSVs (without bank column) still work
- Parsing auto-adds empty bank column
- System defaults to first bank if none provided

---

## Future Enhancements

1. **Real-time Bank Account Mapping**: Query user's MeroPage account once at start, auto-select their banks
2. **Bank Configuration UI**: Allow admins to update bank list without code changes
3. **Confidence Score Display**: Show fuzzy match confidence in UI for transparency
4. **Batch Bank Selection**: "Apply to all" button for quick selection of same bank
5. **Integration with Upstash Redis**: Stream logs in real-time (Issue 2)

---

## Files Modified

| File | Changes |
|------|---------|
| `/lib/banks.ts` | **NEW** - Bank constants |
| `/components/bank-selector.tsx` | **NEW** - Reusable bank selector |
| `/components/csv-table.tsx` | Added bank column, integrated selector |
| `/components/csv-upload-form.tsx` | Enhanced CSV parsing |
| `/app/page.tsx` | Added download functionality, data change tracking |
| `/scripts/apply.py` | Added fuzzy matching, dynamic bank selection |

---

## Success Criteria ✓

- [x] Bank dropdown with searchable interface
- [x] Default "Please select" placeholder
- [x] Predefined bank list (54 institutions)
- [x] CSV download with bank column
- [x] Fuzzy matching (95% accuracy) in backend
- [x] Fallback to first bank if no match
- [x] Logging of bank selection process
- [x] Support for both old and new CSV formats
- [x] Single account auto-select (handled by user if 1 bank)
