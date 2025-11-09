# Demo Mode Manual Test Checklist

**Test Date**: _______________
**Tester**: _______________
**Browser**: _______________
**OS**: _______________

---

## Pre-Test Setup

- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Test script passed (`./src/test/demo-test-script.sh`)
- [ ] Browser DevTools open (Console + Network tabs)

---

## Test 1: Application Startup

### Steps:
1. Run `npm run demo`
2. Wait for app to load
3. Check browser console

### Verify:
- [ ] App loads without errors
- [ ] Demo banner is visible at top of page
- [ ] Banner clearly states "DEMO MODE" or similar
- [ ] Console shows no red errors
- [ ] Console shows MSW initialization message (if applicable)
- [ ] Page is fully responsive

**Notes**: _______________________________________________

---

## Test 2: Upload Flow

### Steps:
1. Navigate to upload page (if not already there)
2. Locate file input or drag-drop area
3. Select a blueprint file (use demo assets if provided)
4. Click "Upload" or similar button
5. Observe response

### Verify:
- [ ] Upload button is visible and clickable
- [ ] File selection works
- [ ] Upload triggers without actual network call
- [ ] Success message displays
- [ ] Redirects to job status page
- [ ] Job ID is displayed

**Network Tab Check**:
- [ ] No requests to real backend API (e.g., http://localhost:3000)
- [ ] Only mock/intercepted requests (if visible)

**Notes**: _______________________________________________

---

## Test 3: Job Status & Polling

### Steps:
1. On job status page after upload
2. Observe status changes
3. Wait for "completed" status (should be quick in demo)

### Verify:
- [ ] Initial status shows "Queued" or "Processing"
- [ ] Progress indicator animates
- [ ] Status updates automatically (polling)
- [ ] Transitions to "Completed" status
- [ ] "View Results" button appears
- [ ] No actual network polling to real API

**Timing**:
- Initial status: _______________
- Time to completion: _______________

**Notes**: _______________________________________________

---

## Test 4: Detection Results Display

### Steps:
1. Click "View Results" from job status page
2. Examine results page layout
3. Check all data sections

### Verify:
- [ ] Results page loads without errors
- [ ] Blueprint image displays
- [ ] Detected rooms list is visible
- [ ] Room count matches expected demo data
- [ ] Room details display (name, type, dimensions, etc.)
- [ ] No missing data or "undefined" values
- [ ] Layout is clean and organized

**Room Data Visible**:
- [ ] Room names
- [ ] Room types (bedroom, kitchen, etc.)
- [ ] Dimensions
- [ ] Confidence scores
- [ ] Any other metadata

**Notes**: _______________________________________________

---

## Test 5: Room Visualization

### Steps:
1. Locate blueprint/floor plan visualization
2. Interact with rooms (hover, click)
3. Test any interactive features

### Verify:
- [ ] Blueprint SVG/image renders correctly
- [ ] Room boundaries are visible
- [ ] Each room has distinct color/label
- [ ] Hover effects work (if implemented)
- [ ] Click selects room (if implemented)
- [ ] Selected room details display
- [ ] Zoom/pan controls work (if implemented)
- [ ] Visualization is responsive

**Interactive Features**:
- [ ] Tooltips on hover
- [ ] Room highlighting
- [ ] Click to select
- [ ] Legend/key visible

**Notes**: _______________________________________________

---

## Test 6: Export Functionality

### Steps:
1. Locate "Export" or "Download" button
2. Click to initiate export
3. Check downloaded file

### Verify:
- [ ] Export button is visible
- [ ] Click triggers download
- [ ] File downloads successfully
- [ ] File format is correct (JSON/CSV/PDF)
- [ ] File contains expected data
- [ ] File is readable/parseable
- [ ] No console errors during export

**File Details**:
- File name: _______________
- File size: _______________
- File format: _______________
- Data complete: [ ] Yes [ ] No

**Notes**: _______________________________________________

---

## Test 7: Navigation & Routing

### Steps:
1. Navigate through all app routes
2. Use browser back/forward buttons
3. Try direct URL access
4. Test invalid routes

### Verify:
- [ ] Home/Upload page accessible
- [ ] Job status page accessible (with job ID)
- [ ] Results page accessible (with job ID)
- [ ] Back button works correctly
- [ ] Forward button works correctly
- [ ] Direct URL navigation works
- [ ] 404 page shows for invalid routes
- [ ] All routes work in demo mode

**Routes Tested**:
- [ ] `/` or `/upload`
- [ ] `/jobs/:id`
- [ ] `/results/:id`
- [ ] `/invalid-route` (404 check)

**Notes**: _______________________________________________

---

## Test 8: Error Handling

### Steps:
1. Try various edge cases (if possible in demo)
2. Refresh page during processing
3. Test back button during upload

### Verify:
- [ ] Invalid file type rejected (if validation exists)
- [ ] Error messages are clear
- [ ] Page refresh maintains state (if applicable)
- [ ] No crashes or white screens
- [ ] Error states display properly

**Errors Tested**:
- _______________________________________________

**Notes**: _______________________________________________

---

## Test 9: Network Isolation (CRITICAL)

### Steps:
1. Clear browser Network tab
2. Perform complete flow: upload → status → results
3. Examine all network requests

### Verify (CRITICAL):
- [ ] **ZERO** requests to real backend API
- [ ] No 404 or network errors
- [ ] All data from mock files
- [ ] No external API calls
- [ ] No CORS errors

### Offline Test:
1. Disconnect internet
2. Restart demo mode
3. Perform complete flow

- [ ] App works fully offline
- [ ] No "network unavailable" errors
- [ ] All features functional

**Network Requests Found**: _______________

**Notes**: _______________________________________________

---

## Test 10: Console & Errors

### Steps:
1. Monitor console throughout all tests
2. Check for warnings and errors
3. Review console logs

### Verify:
- [ ] No red errors in console
- [ ] No unhandled promise rejections
- [ ] Warnings are expected/acceptable
- [ ] MSW logs indicate active mocking
- [ ] No 404s for assets (images, fonts, etc.)

**Console Issues Found**:
- _______________________________________________

**Notes**: _______________________________________________

---

## Test 11: Performance

### Steps:
1. Note initial page load time
2. Observe transition smoothness
3. Check CPU/memory usage (if profiling)

### Verify:
- [ ] Initial load under 3 seconds
- [ ] Smooth page transitions
- [ ] No UI freezing or lag
- [ ] Animations are fluid
- [ ] App feels responsive

**Load Times**:
- Initial load: _______________
- Upload to status: _______________
- Status to results: _______________

**Notes**: _______________________________________________

---

## Test 12: Mobile/Responsive

### Steps:
1. Resize browser window
2. Test at mobile breakpoints (375px, 768px)
3. Test tablet size (1024px)

### Verify:
- [ ] Mobile view (375px) works
- [ ] Tablet view (768px) works
- [ ] Desktop view (1024px+) works
- [ ] No horizontal scrolling
- [ ] Touch targets adequate size
- [ ] Text readable at all sizes
- [ ] Images scale properly

**Breakpoints Tested**:
- [ ] 375px (mobile)
- [ ] 768px (tablet)
- [ ] 1024px (desktop)

**Notes**: _______________________________________________

---

## Test 13: Browser Compatibility

### Test in multiple browsers:

**Chrome/Chromium**:
- Version: _______________
- [ ] All tests pass
- Issues: _______________

**Firefox**:
- Version: _______________
- [ ] All tests pass
- Issues: _______________

**Safari** (if macOS):
- Version: _______________
- [ ] All tests pass
- Issues: _______________

**Edge** (if available):
- Version: _______________
- [ ] All tests pass
- Issues: _______________

---

## Test 14: Accessibility (Optional)

### Steps:
1. Navigate using keyboard only
2. Test with screen reader (if available)
3. Check color contrast

### Verify:
- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Enter key activates buttons
- [ ] Escape key closes modals (if any)
- [ ] Screen reader friendly (if tested)
- [ ] Color contrast adequate

**Notes**: _______________________________________________

---

## Overall Assessment

### Critical Issues (Blocking):
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Major Issues (High Priority):
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues (Low Priority):
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Nice-to-Have Improvements:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Final Verdict

**Status**: [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS

**Recommendation**:
_______________________________________________
_______________________________________________
_______________________________________________

**Sign-off**:
- Tester: _______________
- Date: _______________
- Time Spent: _______________

---

## Screenshots

**Upload Page**: _______________
**Job Status Page**: _______________
**Results Page**: _______________
**Visualization**: _______________
**Network Tab**: _______________

(Attach screenshots separately or reference file locations)

---

## Next Steps

- [ ] Create DEMO_VERIFICATION.md report
- [ ] Update frontend/README.md
- [ ] Report issues to development team
- [ ] Store completion flag (demo-qa/completed)
- [ ] Archive test results
