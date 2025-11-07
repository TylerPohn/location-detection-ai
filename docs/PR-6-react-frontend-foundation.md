# PR-6: React Frontend Foundation

## Overview
Set up the React + Vite frontend application with TypeScript, Material UI, routing, and development tooling.

## Dependencies
**Requires:** PR-1 (Project Foundation)

## Objectives
- Initialize React + Vite project with TypeScript
- Configure Material UI with custom theme
- Set up React Router for navigation
- Configure ESLint, Prettier, and TypeScript
- Create base component structure and layouts
- Set up TanStack Query for data fetching

## Detailed Steps

### 1. Initialize Vite React Project
**Estimated Time:** 20 minutes

```bash
cd frontend

# Create Vite React TypeScript project
npm create vite@latest . -- --template react-ts

# Install base dependencies
npm install

# Install Material UI and icons
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled

# Install routing
npm install react-router-dom

# Install state management and data fetching
npm install @tanstack/react-query

# Install dev dependencies
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-plugin-react eslint-plugin-react-hooks \
  prettier eslint-config-prettier
```

**Verification:** Run `npm run dev` and open browser to verify React app loads.

### 2. Configure TypeScript
**Estimated Time:** 15 minutes

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/services/*": ["src/services/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Update vite.config.ts for path aliases:

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

**Verification:** Run `npm run build` to verify TypeScript compiles.

### 3. Configure ESLint and Prettier
**Estimated Time:** 20 minutes

```json
// frontend/.eslintrc.json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["react", "@typescript-eslint"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "react/prop-types": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

```json
// frontend/.prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

Update package.json scripts:

```json
// frontend/package.json - Add to scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css}\"",
    "typecheck": "tsc --noEmit",
    "test": "echo \"Tests will be added in PR-10\""
  }
}
```

**Verification:** Run `npm run lint` and `npm run format`.

### 4. Create Theme Configuration
**Estimated Time:** 30 minutes

```typescript
// frontend/src/theme/theme.ts
import { createTheme, ThemeOptions } from '@mui/material/styles';

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
```

**Verification:** Import theme in App.tsx and verify it compiles.

### 5. Set Up Router Structure
**Estimated Time:** 25 minutes

```typescript
// frontend/src/types/routes.ts
export const ROUTES = {
  HOME: '/',
  UPLOAD: '/upload',
  RESULTS: '/results/:jobId',
  ABOUT: '/about',
} as const;
```

```tsx
// frontend/src/pages/HomePage.tsx
import { Typography, Container, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/types/routes';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" gutterBottom>
          Location Detection AI
        </Typography>
        <Typography variant="h3" color="text.secondary" gutterBottom>
          Automated Blueprint Room Boundary Detection
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
          Upload your architectural blueprint and let AI automatically detect room boundaries.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate(ROUTES.UPLOAD)}
          sx={{ px: 4, py: 1.5 }}
        >
          Get Started
        </Button>
      </Box>
    </Container>
  );
}
```

```tsx
// frontend/src/pages/UploadPage.tsx
import { Typography, Container } from '@mui/material';

export function UploadPage() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h2" gutterBottom>
        Upload Blueprint
      </Typography>
      <Typography color="text.secondary">
        Upload functionality will be implemented in PR-7
      </Typography>
    </Container>
  );
}
```

```tsx
// frontend/src/pages/ResultsPage.tsx
import { Typography, Container } from '@mui/material';
import { useParams } from 'react-router-dom';

export function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <Container maxWidth="lg">
      <Typography variant="h2" gutterBottom>
        Results
      </Typography>
      <Typography color="text.secondary">
        Viewing results for job: {jobId}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        Visualization will be implemented in PR-9
      </Typography>
    </Container>
  );
}
```

**Verification:** Create page files and verify they compile.

### 6. Create Layout Components
**Estimated Time:** 35 minutes

```tsx
// frontend/src/components/Layout/AppLayout.tsx
import { ReactNode } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '@/theme/theme';
import { AppBar } from './AppBar';
import { Footer } from './Footer';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <AppBar />
        <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </ThemeProvider>
  );
}
```

```tsx
// frontend/src/components/Layout/AppBar.tsx
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';
import { ROUTES } from '@/types/routes';

export function AppBar() {
  const navigate = useNavigate();

  return (
    <MuiAppBar position="static">
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => navigate(ROUTES.HOME)}
          sx={{ mr: 2 }}
        >
          <HomeIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Location Detection AI
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button color="inherit" onClick={() => navigate(ROUTES.UPLOAD)}>
            Upload
          </Button>
          <Button color="inherit" onClick={() => navigate(ROUTES.ABOUT)}>
            About
          </Button>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}
```

```tsx
// frontend/src/components/Layout/Footer.tsx
import { Box, Container, Typography, Link } from '@mui/material';

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.background.paper,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center">
          {'© '}
          {new Date().getFullYear()}{' '}
          <Link color="inherit" href="https://innergy.com">
            Innergy AI
          </Link>
          {'. All rights reserved.'}
        </Typography>
      </Container>
    </Box>
  );
}
```

**Verification:** Import components and verify they render.

### 7. Set Up TanStack Query
**Estimated Time:** 20 minutes

```typescript
// frontend/src/config/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});
```

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/config/queryClient';
import { AppLayout } from '@/components/Layout/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { UploadPage } from '@/pages/UploadPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { ROUTES } from '@/types/routes';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.UPLOAD} element={<UploadPage />} />
            <Route path={ROUTES.RESULTS} element={<ResultsPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
```

**Verification:** Run `npm run dev` and navigate to different routes.

### 8. Create Environment Configuration
**Estimated Time:** 15 minutes

```typescript
// frontend/src/config/env.ts
interface EnvironmentConfig {
  apiBaseUrl: string;
  awsRegion: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const env: EnvironmentConfig = {
  apiBaseUrl: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001',
  awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Validate required environment variables
if (env.isProduction && !import.meta.env.VITE_API_GATEWAY_URL) {
  throw new Error('VITE_API_GATEWAY_URL is required in production');
}
```

Update .env.example:

```bash
# frontend/.env.example
VITE_API_GATEWAY_URL=https://your-api-gateway.amazonaws.com
VITE_AWS_REGION=us-east-1
```

**Verification:** Import env config and verify it loads.

### 9. Create TypeScript Type Definitions
**Estimated Time:** 20 minutes

```typescript
// frontend/src/types/api.ts
export interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadResponse {
  jobId: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface Room {
  id: string;
  lines: Line[];
  polygon: Point[];
  area: number;
  perimeter: number;
  name_hint?: string;
}

export interface Line {
  start: Point;
  end: Point;
}

export type Point = [number, number];

export interface DetectionResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  roomCount?: number;
  rooms?: Room[];
  error?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
```

**Verification:** Import types in a component and verify TypeScript recognizes them.

### 10. Update Project Documentation
**Estimated Time:** 15 minutes

```markdown
<!-- frontend/README.md -->
# Location Detection AI - Frontend

React + Vite frontend application for automated blueprint room boundary detection.

## Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **UI Library:** Material UI (MUI)
- **Routing:** React Router v6
- **State Management:** TanStack Query (React Query)
- **Styling:** Emotion (CSS-in-JS)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
# Start dev server (http://localhost:3000)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
│   └── Layout/    # Layout components
├── pages/         # Page components (routes)
├── hooks/         # Custom React hooks
├── services/      # API services
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── theme/         # MUI theme configuration
└── config/        # App configuration
```

## Environment Variables

Copy `.env.example` to `.env.local` and update values:

```bash
VITE_API_GATEWAY_URL=https://your-api-gateway.amazonaws.com
VITE_AWS_REGION=us-east-1
```

## Available Routes

- `/` - Home page
- `/upload` - Blueprint upload page
- `/results/:jobId` - Results visualization page

## Code Style

- ESLint + Prettier for code formatting
- TypeScript strict mode enabled
- React hooks rules enforced
- Path aliases configured (@/components, @/hooks, etc.)
```

**Verification:** Read through README and verify all commands work.

## Acceptance Criteria

- [ ] Vite + React + TypeScript project initialized
- [ ] Material UI integrated with custom dark theme
- [ ] React Router configured with all pages
- [ ] ESLint and Prettier configured
- [ ] TypeScript strict mode enabled with path aliases
- [ ] TanStack Query set up with QueryClient
- [ ] Layout components (AppBar, Footer) created
- [ ] All pages render without errors
- [ ] Environment configuration working
- [ ] Type definitions created for API responses
- [ ] Development server runs on port 3000
- [ ] README documentation complete

## Testing Instructions

```bash
cd frontend

# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Start dev server
npm run dev

# Open browser to http://localhost:3000
# Navigate through all routes:
# - Home page (/)
# - Upload page (/upload)
# - Results page (/results/test-123)

# Build for production
npm run build

# Preview production build
npm run preview
```

## Estimated Total Time
**3-4 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-6 is merged, the following PRs can be started in parallel:
- **PR-7** (Blueprint Upload) - depends on this foundation
- **PR-9** (Room Rendering) - depends on this foundation

## Notes for Junior Engineers

- **Vite is fast** - much faster than Create React App
- **Path aliases** - use `@/components` instead of `../../../components`
- **Dark theme** - MUI theme is configured, all components will use it
- **React Query DevTools** - bottom left corner in dev mode, very helpful
- **TypeScript strict mode** - catches bugs early, don't use `any`
- **Environment variables** - must start with `VITE_` to be accessible
- **Hot reload** - Vite automatically reloads on file changes
- **Component organization** - keep components small and focused
