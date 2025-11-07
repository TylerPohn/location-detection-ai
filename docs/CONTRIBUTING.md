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
