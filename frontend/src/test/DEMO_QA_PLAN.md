# Demo Mode QA Verification Plan

## Status: WAITING FOR DEPENDENCIES

**Last Updated**: 2025-11-07
**QA Engineer**: Demo QA Agent
**Status**: Awaiting completion of prerequisite agents

---

## Dependencies Status

### Required Completions:
- [ ] Demo Data Engineer (demo-data/completed)
- [ ] MSW Engineer (msw/completed)
- [ ] Demo Script Engineer (demo-script/completed)

### Current State:
- ❌ `/src/demo` directory: **NOT FOUND**
- ❌ `npm run demo` script: **NOT CONFIGURED**
- ❌ Demo data files: **NOT CREATED**
- ❌ MSW handlers: **NOT IMPLEMENTED**

---

## Expected File Structure

Once dependencies complete, verify this structure exists:

```
src/demo/
├── assets/blueprints/
│   ├── office-floor.svg          # Sample office blueprint
│   ├── apartment.svg              # Sample apartment blueprint
│   └── warehouse.svg              # Sample warehouse blueprint
├── data/
│   ├── detectionResults.ts        # Mock AI detection results
│   ├── jobs.ts                    # Mock job status data
│   └── uploadResponses.ts         # Mock upload API responses
├── mocks/
│   ├── handlers.ts                # MSW request handlers
│   └── browser.ts                 # MSW browser setup
├── DemoBanner.tsx                 # Visual indicator for demo mode
├── main.tsx (optional)            # Demo mode entry point
└── README.md                      # Demo documentation
```

---

## Test Plan

### 1. Installation & Setup Tests

#### 1.1 Package.json Configuration
- [ ] `npm run demo` script exists
- [ ] Script points to correct entry point
- [ ] All demo dependencies are installed (msw, etc.)

#### 1.2 File Structure Verification
- [ ] All demo directories exist
- [ ] All required data files present
- [ ] All mock handlers implemented
- [ ] Blueprint assets available

### 2. Functional Tests

#### 2.1 Application Startup
```bash
cd /Users/tyler/Desktop/Gauntlet/location-detection-ai/frontend
npm run demo
```

**Expected Results:**
- [ ] App starts without errors
- [ ] No TypeScript compilation errors
- [ ] No missing import errors
- [ ] Demo banner displays prominently
- [ ] Console shows "Demo Mode Active" or similar

#### 2.2 Upload Flow
- [ ] Upload page loads successfully
- [ ] File input accepts blueprint images
- [ ] Upload button triggers mock API call
- [ ] Success message displays
- [ ] Redirects to job status page

#### 2.3 Mock API Responses
- [ ] POST `/api/upload` returns mock job ID
- [ ] GET `/api/jobs/:id` returns mock job status
- [ ] Job status progresses: queued → processing → completed
- [ ] GET `/api/jobs/:id/results` returns mock detection results
- [ ] No actual network calls made (verify in Network tab)

#### 2.4 Job Status Polling
- [ ] Status page displays "Processing..." initially
- [ ] Progress indicator animates
- [ ] Status updates automatically (polling)
- [ ] Transitions to results when "completed"
- [ ] Error states handled gracefully

#### 2.5 Detection Results Display
- [ ] Results page renders without errors
- [ ] Mock room data displays correctly
- [ ] Blueprint overlay shows detected rooms
- [ ] Room colors/labels visible
- [ ] Room metadata displays (dimensions, type, etc.)

#### 2.6 Room Visualization
- [ ] SVG blueprint renders properly
- [ ] Detected room boundaries visible
- [ ] Interactive hover states work
- [ ] Room selection highlights correctly
- [ ] Zoom/pan controls functional (if implemented)

#### 2.7 Export Functionality
- [ ] Export button visible
- [ ] Click triggers download
- [ ] File format correct (JSON/CSV/PDF)
- [ ] Exported data matches displayed results
- [ ] No errors in console

### 3. Integration Tests

#### 3.1 Complete User Journey
Test the full workflow end-to-end:

1. Start app in demo mode
2. Navigate to upload page
3. Select blueprint file
4. Click upload
5. Wait for processing (mock)
6. View detection results
7. Interact with room visualization
8. Export results
9. Return to home/upload

**Expected:** Smooth flow with no errors

#### 3.2 Navigation Tests
- [ ] All routes work in demo mode
- [ ] Back button functions correctly
- [ ] Direct URL access works
- [ ] 404 page handles invalid routes

### 4. Network Isolation Tests

#### 4.1 No External API Calls
**Critical:** Verify NO real backend calls are made

```javascript
// In browser DevTools console:
// 1. Open Network tab
// 2. Clear all requests
// 3. Run through complete demo flow
// 4. Verify:
```

- [ ] Zero requests to actual backend API
- [ ] Only local/mock requests (if any)
- [ ] No 404 or network errors
- [ ] All data comes from mock files

#### 4.2 Offline Functionality
- [ ] Disconnect network
- [ ] Run demo mode
- [ ] All features still work
- [ ] No "network unavailable" errors

### 5. Error Handling Tests

#### 5.1 Mock Error Scenarios
If mock handlers support error simulation:

- [ ] Upload failure displays error message
- [ ] Job not found shows 404 page
- [ ] Processing timeout handled
- [ ] Invalid file type rejected

#### 5.2 Edge Cases
- [ ] Large blueprint files (if size limits exist)
- [ ] Rapid successive uploads
- [ ] Browser refresh during processing
- [ ] Back button during upload

### 6. UI/UX Tests

#### 6.1 Demo Banner
- [ ] Banner clearly visible
- [ ] States demo mode prominently
- [ ] Explains this is mock data
- [ ] Provides link to real app (if applicable)

#### 6.2 Visual Consistency
- [ ] Matches production UI styling
- [ ] Responsive design works
- [ ] Mobile view functional
- [ ] No layout breaks

#### 6.3 Performance
- [ ] Initial load under 2 seconds
- [ ] Smooth transitions
- [ ] No UI freezing
- [ ] Animations fluid

### 7. Console & Error Tests

#### 7.1 Console Cleanliness
- [ ] No errors in console
- [ ] No warnings (or only expected warnings)
- [ ] MSW logs indicate mocking is active
- [ ] No 404s for assets

#### 7.2 TypeScript Checks
```bash
npm run typecheck
```
- [ ] No TypeScript errors
- [ ] All types properly defined
- [ ] Mock data types match API contracts

### 8. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on macOS)
- [ ] Edge (if available)

### 9. Documentation Tests

#### 9.1 Demo README
- [ ] Instructions clear and complete
- [ ] Prerequisites listed
- [ ] Run command documented
- [ ] Features list accurate

#### 9.2 Code Comments
- [ ] Mock handlers well-commented
- [ ] Complex logic explained
- [ ] TODO items noted (if any)

---

## Verification Checklist

### Pre-Flight Checks
- [ ] All dependencies installed
- [ ] No TypeScript errors
- [ ] All files present

### Core Functionality
- [ ] Upload works
- [ ] Status polling works
- [ ] Results display works
- [ ] Export works

### Critical Requirements
- [ ] No real API calls
- [ ] No network errors
- [ ] Demo banner visible
- [ ] Complete flow functional

### Documentation
- [ ] README updated
- [ ] Verification report created
- [ ] Issues documented

---

## Test Execution Log

### Test Run 1: [DATE/TIME]
**Status**: Pending
**Tester**: [Name]
**Results**: [To be filled]

### Issues Found:
1. [Issue description]
2. [Issue description]

### Screenshots:
- [Location of screenshots]

---

## Acceptance Criteria

### Must Have (Blocking):
✅ All demo features work end-to-end
✅ No errors in console
✅ No network calls to external APIs
✅ Verification report created
✅ Documentation updated

### Should Have (Non-blocking):
- Smooth performance
- Mobile responsive
- All edge cases handled
- Comprehensive error messages

### Nice to Have:
- Additional demo scenarios
- Interactive tutorial
- Performance metrics
- Accessibility features

---

## Post-Verification Steps

Once all tests pass:

1. ✅ Create `DEMO_VERIFICATION.md` report
2. ✅ Update `frontend/README.md`
3. ✅ Store completion flag: `demo-qa/completed`
4. ✅ Notify coordination system
5. ✅ Archive test results

---

## Notes

### Known Limitations:
- Demo data is static
- Polling intervals may differ from production
- Some advanced features may be simplified

### Future Improvements:
- Add more demo scenarios
- Interactive demo tutorial
- Performance benchmarks
- Automated E2E tests with Playwright

---

## Contact

**QA Engineer**: Demo QA Agent
**Coordination**: claude-flow memory (demo-swarm namespace)
**Issues**: Document in DEMO_VERIFICATION.md
