# Security Policy

The LibreM project takes the security of school and institutional data seriously. This document outlines our vulnerability handling process and version support policy.

---

## Supported Versions

Only the latest minor release receives active security patches and updates.

| Version | Supported          |
|:--------|:-------------------|
| 1.0.x   | Yes                |
| < 1.0   | No                 |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities via public GitHub issues.**

If you believe you have discovered a vulnerability in LibreM:

1. Send a private report to the core security team at `security@librem.dev` (or via GitHub Private Vulnerability Reporting).
2. Include:
   - Vulnerability description and impact assessment
   - Proof of Concept (PoC) or step-by-step reproduction instructions
   - Affected components (`internal/handler`, `pkg/database`, frontend, etc.)
   - Any suggested remediations or mitigations

### Response Timeline
- **Initial Acknowledgement**: Within 48 hours of report submission.
- **Triage & Assessment**: Within 5 business days.
- **Fix & Disclosure**: Coordinated release schedule following fix validation.

---

## Security Best Practices for Production Deployments

When running LibreM in institutional or multi-workstation environments:
1. **Change Default Secrets**: Always update `JWT_SECRET` and `DB_PASSWORD` in your production `.env`.
2. **Firewall Rules**: When deploying in Headless LAN mode (`--server`), ensure port `8080` is restricted to authorized internal school subnets.
3. **Database Isolation**: The portable PostgreSQL cluster is configured for local loopback (`127.0.0.1`) only by default. Do not expose port `5432` to untrusted external interfaces.
