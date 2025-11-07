# PR-1: Project Foundation and Infrastructure Setup

## Overview
Set up the initial project structure, development environment, and foundational configurations for the Location Detection AI system.

## Dependencies
**None** - This is the foundation PR that all others depend on.

## Objectives
- Initialize monorepo structure with frontend and backend directories
- Configure build tools, linters, and formatters
- Set up version control and branching strategy
- Create environment configuration templates
- Initialize package management

## Detailed Steps

### 1. Repository Structure Setup
**Estimated Time:** 30 minutes

```bash
# Create root project structure
mkdir -p location-detection-ai
cd location-detection-ai

# Create main directories
mkdir -p frontend
mkdir -p backend
mkdir -p infrastructure
mkdir -p docs
mkdir -p .github/workflows
```

**Verification:** Run `ls -la` and confirm all directories exist.

### 2. Initialize Package Management
**Estimated Time:** 20 minutes

```bash
# Initialize root package.json
npm init -y

# Create workspace configuration
cat > package.json << 'EOF'
{
  "name": "location-detection-ai",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend",
    "infrastructure"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces"
  }
}
EOF
```

**Verification:** Run `npm install` and confirm workspaces are recognized.

### 3. Git Configuration
**Estimated Time:** 15 minutes

```bash
# Initialize git repository
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.lcov

# Production
build/
dist/
.next/

# Environment
.env
.env.local
.env.*.local

# IDEs
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# AWS
.aws/
cdk.out/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF
```

**Verification:** Run `git status` to confirm .gitignore is working.

### 4. EditorConfig and Code Style
**Estimated Time:** 10 minutes

```bash
# Create .editorconfig
cat > .editorconfig << 'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
EOF
```

**Verification:** Open any file in VS Code and verify indentation settings.

### 5. Environment Template Files
**Estimated Time:** 20 minutes

```bash
# Create .env.example for frontend
cat > frontend/.env.example << 'EOF'
VITE_API_GATEWAY_URL=https://your-api-gateway.amazonaws.com
VITE_AWS_REGION=us-east-1
VITE_S3_BUCKET_NAME=your-blueprint-bucket
EOF

# Create .env.example for backend
cat > backend/.env.example << 'EOF'
AWS_REGION=us-east-1
S3_BUCKET_NAME=location-detection-blueprints
SAGEMAKER_ENDPOINT_NAME=location-detector-endpoint
LOG_LEVEL=info
EOF

# Create .env.example for infrastructure
cat > infrastructure/.env.example << 'EOF'
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1
ENVIRONMENT=development
PROJECT_NAME=location-detection-ai
EOF
```

**Verification:** Confirm all `.env.example` files exist and can be copied.

### 6. Documentation Structure
**Estimated Time:** 15 minutes

```bash
# Create README.md
cat > README.md << 'EOF'
# Location Detection AI

Automated blueprint room boundary detection using AWS serverless AI services.

## Quick Start

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)

## Project Structure

- `frontend/` - React + Vite UI application
- `backend/` - AWS Lambda functions and AI service
- `infrastructure/` - AWS CDK infrastructure code
- `docs/` - Project documentation and PR guides

## Development

```bash
npm install
npm run build
npm run test
```

## Documentation

- [Product Requirements](docs/LocationDetectionAI_PRD.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Contributing Guide](docs/CONTRIBUTING.md)

EOF

# Create CONTRIBUTING.md template
cat > docs/CONTRIBUTING.md << 'EOF'
# Contributing Guide

## Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

## PR Process

1. Create feature branch from `develop`
2. Implement changes following PR documentation
3. Write tests (unit + integration)
4. Update documentation
5. Submit PR with reference to PR doc number

## Code Standards

- TypeScript for all new code
- ESLint + Prettier for formatting
- 80%+ test coverage required
- No console.log in production code

EOF
```

**Verification:** Open README.md and confirm markdown renders correctly.

### 7. GitHub Actions Workflow Templates
**Estimated Time:** 25 minutes

```bash
# Create CI workflow
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
EOF
```

**Verification:** Commit and push to trigger GitHub Actions.

### 8. License and Security
**Estimated Time:** 10 minutes

```bash
# Create LICENSE file (MIT)
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 Innergy AI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Create SECURITY.md
cat > SECURITY.md << 'EOF'
# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities to security@innergy.com

Do not open public issues for security vulnerabilities.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

EOF
```

**Verification:** Confirm files exist and are properly formatted.

## Acceptance Criteria

- [ ] Repository structure created with frontend, backend, infrastructure, docs directories
- [ ] npm workspaces configured and working
- [ ] Git initialized with proper .gitignore
- [ ] EditorConfig and code style files in place
- [ ] Environment template files created for all workspaces
- [ ] README.md and CONTRIBUTING.md documentation complete
- [ ] GitHub Actions CI workflow configured
- [ ] LICENSE and SECURITY.md files added
- [ ] All verification steps pass
- [ ] First commit made to `develop` branch

## Testing Instructions

```bash
# Clone repository
git clone <repo-url>
cd location-detection-ai

# Verify workspace setup
npm install
npm run lint --workspaces  # Should show no workspaces have lint yet
npm run build --workspaces # Should show no workspaces have build yet

# Verify file structure
tree -L 2 -I node_modules

# Verify git is configured
git status
git log
```

## Estimated Total Time
**2-3 hours** for a junior engineer following step-by-step.

## Next Steps
After PR-1 is merged, the following PRs can be started in parallel:
- **PR-2** (AWS CDK Infrastructure) - depends on this PR
- **PR-6** (React Frontend Foundation) - depends on this PR

## Notes for Junior Engineers

- **Don't skip verification steps** - they catch issues early
- **Use exact commands** - copy/paste to avoid typos
- **Read error messages carefully** - npm/git errors are usually descriptive
- **Ask for help** if any verification step fails
- **Commit frequently** - after each major step completes
- **Keep .env files secure** - never commit actual credentials
