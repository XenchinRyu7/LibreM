# Contributing to LibreM

Thank you for your interest in contributing to LibreM. As an open-source project dedicated to advancing educational infrastructure, we welcome contributions ranging from bug fixes and documentation improvements to new features and performance optimizations.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to standard professional etiquette. Treat everyone with respect, avoid derogatory language, and focus on constructive critique and technical rigor.

---

## Getting Started

### 1. Fork and Clone
```bash
git clone https://github.com/<your-username>/LibreM.git
cd LibreM
```

### 2. Branching Strategy
Create a dedicated branch following standard conventions:
- `feat/feature-name` for new capabilities
- `fix/issue-description` for bug repairs
- `docs/topic-name` for documentation enhancements
- `perf/optimization-target` for performance tuning

```bash
git checkout -b feat/opac-advanced-filter
```

### 3. Development Workflow

- **Backend (Go)**:
  - Run `go vet ./...` to verify syntax and potential logic hazards.
  - Run `golangci-lint run` if installed.
  - Adhere to effective Go naming conventions and standard project layout (`cmd/`, `internal/`, `pkg/`).
  - Keep domain logic decoupled from HTTP transport.

- **Frontend (TypeScript / React)**:
  - Ensure strict TypeScript typing (`noImplicitAny`).
  - Follow component structure in `frontend/src/components`.
  - Maintain styling consistency using Tailwind CSS utility tokens.
  - Verify build integrity with `npm run build` inside `frontend/`.

---

## Submitting Pull Requests

1. **Keep Pull Requests Focused**: Each pull request should address a single concern or feature.
2. **Commit Messages**: Write concise, descriptive commit messages adhering to Conventional Commits:
   ```
   feat(catalog): add ISBN-13 checksum validation
   fix(desktop): resolve edge profile path on multi-user systems
   docs(readme): clarify local development environment setup
   ```
3. **Open PR against `main`**: Describe the changes, motivations, and testing steps performed.
4. **Code Review**: Address maintainer feedback promptly. Rebase instead of merge-commit when updating branches.

---

## Reporting Issues

If you encounter unexpected behavior or bugs:
1. Search existing issues to verify it has not already been reported.
2. Open a new issue providing:
   - Operating System and Version (e.g. Windows 11 23H2)
   - LibreM Version or Git commit hash
   - Detailed reproduction steps
   - Expected vs. actual behavior
   - Relevant log snippets from `librem.log`
