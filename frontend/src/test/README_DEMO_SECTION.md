# Demo Mode Section for frontend/README.md

This content should be added to the main frontend/README.md once demo mode is verified and working.

---

## 🎭 Demo Mode

Experience the full functionality of the Location Detection AI without requiring backend infrastructure. Demo mode uses Mock Service Worker (MSW) to simulate all API interactions with realistic data.

### Features

- **✨ Full Feature Preview**: Experience complete upload → processing → results workflow
- **🔒 No Backend Required**: All API calls intercepted and mocked locally
- **📊 Realistic Data**: Pre-loaded detection results with sample blueprints
- **🎨 Interactive Visualization**: Explore room detection with sample floor plans
- **📤 Export Functionality**: Test data export features
- **🌐 Offline Capable**: Works without internet connection

### Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Start demo mode
npm run demo
```

The application will launch in demo mode with a prominent banner indicating you're using mock data.

### What's Included

Demo mode includes:

1. **Sample Blueprints**
   - Office floor plan
   - Apartment layout
   - Warehouse space

2. **Mock AI Detection Results**
   - Room boundaries and dimensions
   - Room type classification (bedroom, kitchen, etc.)
   - Confidence scores
   - Complete metadata

3. **Job Processing Simulation**
   - Upload confirmation
   - Status polling (queued → processing → completed)
   - Result retrieval

4. **All UI Features**
   - Upload page
   - Job status tracking
   - Results visualization
   - Room detail views
   - Export functionality

### Demo Workflow

1. **Upload**: Select any image file (demo accepts any file)
2. **Processing**: Watch simulated job status updates
3. **Results**: View pre-loaded detection results
4. **Visualization**: Interact with room boundaries and labels
5. **Export**: Download mock results in your chosen format

### Technical Details

Demo mode uses:
- **MSW (Mock Service Worker)**: Intercepts network requests
- **Static Mock Data**: Pre-defined responses in `src/demo/data/`
- **Sample Assets**: Blueprint images in `src/demo/assets/`
- **No Backend Calls**: All API interactions are mocked

### Limitations

Demo mode has some intentional limitations:

- ❌ Cannot process real blueprints
- ❌ No actual AI detection
- ❌ Fixed dataset (same results each time)
- ❌ No data persistence
- ❌ No user authentication

These features are available in the full production version.

### Demo Mode vs Production

| Feature | Demo Mode | Production |
|---------|-----------|------------|
| Upload Files | ✅ Accepts any file | ✅ Validates blueprint formats |
| AI Processing | ❌ Mock data | ✅ Real AI detection |
| Results | ✅ Pre-loaded samples | ✅ Actual detection results |
| Visualization | ✅ Sample blueprints | ✅ Your blueprints |
| Export | ✅ Mock data | ✅ Real results |
| Offline | ✅ Works offline | ❌ Requires backend |
| Persistence | ❌ No database | ✅ Job history saved |

### Troubleshooting Demo Mode

#### Demo Banner Not Showing
If the demo banner doesn't appear:
1. Check console for errors
2. Verify MSW initialized: Look for `[MSW] Mocking enabled` in console
3. Clear browser cache and reload

#### Upload Not Working
If upload doesn't trigger mock response:
1. Check Network tab for intercepted requests
2. Verify handlers are loaded: Check `src/demo/mocks/handlers.ts`
3. Ensure MSW is running: Check for service worker registration

#### Results Not Displaying
If results page is blank:
1. Check console for data errors
2. Verify mock data exists: Check `src/demo/data/detectionResults.ts`
3. Try refreshing the page

#### Console Errors
Expected console messages in demo mode:
- ✅ `[MSW] Mocking enabled`
- ✅ `Demo mode active`
- ✅ MSW request interception logs

Unexpected errors:
- ❌ Network errors to real backend (should never happen)
- ❌ Missing mock data files
- ❌ TypeScript errors

### Extending Demo Mode

To add more demo scenarios:

1. **Add Mock Data**
   ```typescript
   // src/demo/data/detectionResults.ts
   export const newScenario = {
     jobId: 'demo-job-4',
     rooms: [/* ... */]
   };
   ```

2. **Add Blueprint Assets**
   ```
   src/demo/assets/blueprints/new-blueprint.svg
   ```

3. **Update Mock Handlers**
   ```typescript
   // src/demo/mocks/handlers.ts
   http.get('/api/jobs/demo-job-4/results', () => {
     return HttpResponse.json(newScenario);
   })
   ```

4. **Add to Demo Documentation**
   Update `src/demo/README.md` with new scenario details

### Demo Development

Working on demo mode features:

```bash
# Run demo mode in development
npm run demo

# Run tests (including demo mode tests)
npm test

# Type check demo code
npm run typecheck

# Lint demo code
npm run lint
```

### Demo Mode Architecture

```
src/demo/
├── assets/            # Sample blueprints
├── data/             # Mock response data
├── mocks/            # MSW handlers
├── DemoBanner.tsx    # Demo mode indicator
├── main.tsx          # Demo entry point (if separate)
└── README.md         # Demo documentation
```

Mock Service Worker intercepts all `/api/*` requests and returns data from `src/demo/data/`.

### Security Note

Demo mode is safe to share publicly:
- ✅ No real API keys required
- ✅ No backend access
- ✅ No sensitive data
- ✅ Cannot make real API calls
- ✅ Works entirely in browser

### Need Help?

- 📖 Demo Documentation: `src/demo/README.md`
- 🐛 Issues: Check console for error messages
- 🧪 Testing: Review `src/test/DEMO_QA_PLAN.md`
- 💬 Support: [Contact information or link]

### Transition to Production

Ready to use the real application?

1. Stop demo mode
2. Configure backend API endpoint (see [Environment Setup](#environment-setup))
3. Run `npm run dev` for development
4. Deploy to production (see [Deployment](#deployment))

---

**Demo Mode Status**: [✅ Verified / 🚧 In Development]
**Last Tested**: [Date]
**Test Coverage**: [Percentage or details]

---
