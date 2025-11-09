# Demo Mode Documentation

## Overview

Demo mode allows you to run the Location Detection AI application without a backend server. All API requests are intercepted and handled by Mock Service Worker (MSW), providing realistic mock data for testing and demonstration purposes.

## Starting Demo Mode

### Quick Start

```bash
npm run demo
```

This command will:
1. Start Vite in demo mode
2. Load `.env.demo` configuration
3. Initialize MSW (Mock Service Worker)
4. Open the application in your browser
5. Display a demo banner at the top of the page

### Manual Start

Alternatively, you can start demo mode manually:

```bash
# Start with explicit mode flag
npm run dev -- --mode demo

# Or set environment variable
VITE_DEMO_MODE=true npm run dev
```

## Features

### 🎯 Demo Mode Capabilities

- **No Backend Required**: All API calls are mocked locally
- **Realistic Data**: Mock responses match production API structure
- **Full Functionality**: Test all features without infrastructure
- **Visual Indicator**: Banner shows when demo mode is active
- **Fast Development**: No need to set up or run backend services

### 🔧 Configuration

Demo mode is configured through `.env.demo`:

```env
VITE_DEMO_MODE=true
VITE_API_BASE_URL=http://localhost:5173
```

### 📋 Mock Data Structure

Mock Service Worker intercepts the following endpoints:

#### 1. Image Analysis (`POST /api/analyze`)

**Request:**
```typescript
{
  image: File | string (base64)
}
```

**Response:**
```typescript
{
  location: {
    country: string
    city: string | null
    confidence: number
  }
  landmarks: Array<{
    name: string
    confidence: number
    coordinates: {
      latitude: number
      longitude: number
    }
  }>
  features: Array<{
    type: string
    description: string
    confidence: number
  }>
  metadata: {
    processingTime: number
    modelVersion: string
    imageSize: {
      width: number
      height: number
    }
  }
}
```

#### 2. Batch Analysis (`POST /api/batch-analyze`)

Processes multiple images and returns an array of analysis results.

#### 3. Health Check (`GET /api/health`)

Returns service status and version information.

### 🎨 UI Components

#### DemoBanner Component

Location: `src/demo/DemoBanner.tsx`

The demo banner appears at the top of the application when `VITE_DEMO_MODE=true`. Features:

- **Dismissible**: Click the X to hide the banner
- **Information**: Shows demo mode status
- **Visual Chip**: "No Backend Required" indicator
- **Responsive**: Adapts to different screen sizes

### 🧪 Testing Demo Mode

Demo mode is perfect for:

1. **Feature Testing**: Test UI features without backend
2. **UI Development**: Rapid prototyping and styling
3. **Demonstrations**: Show functionality to stakeholders
4. **E2E Tests**: Run tests without external dependencies
5. **Offline Development**: Work without internet connection

### 📦 Mock Implementation

Mock handlers are located in:
- `src/demo/mocks/handlers.ts` - API endpoint handlers
- `src/demo/mocks/browser.ts` - MSW browser configuration
- `src/demo/mocks/data.ts` - Mock data factories

### 🔄 Switching Between Modes

#### Development Mode (with Backend)
```bash
npm run dev
```

#### Demo Mode (no Backend)
```bash
npm run demo
```

#### Production Build
```bash
npm run build
npm run preview
```

### 🐛 Troubleshooting

#### Issue: Demo mode not activating

**Solution:**
1. Check `.env.demo` file exists
2. Verify `VITE_DEMO_MODE=true` is set
3. Clear browser cache and reload
4. Check console for MSW initialization messages

#### Issue: API calls not being mocked

**Solution:**
1. Ensure MSW handlers are properly defined
2. Check `src/demo/mocks/browser.ts` configuration
3. Verify handlers match your API endpoint paths
4. Look for MSW console logs in browser

#### Issue: Demo banner not showing

**Solution:**
1. Check `import.meta.env.VITE_DEMO_MODE` value
2. Verify `DemoBanner` is imported in `AppLayout`
3. Check browser console for React errors

### 📚 Resources

- [Mock Service Worker Docs](https://mswjs.io/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Testing with MSW](https://mswjs.io/docs/getting-started/integrate/react)

### 🚀 Best Practices

1. **Keep Mocks Updated**: Update mock data when API changes
2. **Realistic Data**: Use representative mock data
3. **Error Scenarios**: Test error handling with mock failures
4. **Performance**: Simulate realistic API delays
5. **Coverage**: Mock all critical API endpoints

### 🔐 Security Note

Demo mode is for **development and testing only**. Never use demo mode in production deployments.

## Support

For issues or questions:
- Check the main project README
- Review MSW documentation
- Contact the development team

---

**Happy Testing! 🎉**
