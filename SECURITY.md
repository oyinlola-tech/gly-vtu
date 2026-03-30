# Security Policy

## Proprietary Notice
This project is proprietary and not free to use. Security information is provided solely to authorized collaborators.

## Confidentiality and Authorized Access
The Software is proprietary and confidential. You may not disclose, share, or make any part of the codebase available to third parties without prior written authorization from the owner. Use is permitted only to individuals or entities expressly granted access by the owner.

## Reporting a Vulnerability
Please do not open public issues for security reports.

Send details to the project owner:
- Author: Oluwayemi Oyinlola Michael
- Portfolio/contact: https://oyinlola.site

Include:
- A clear description of the issue
- Steps to reproduce
- Impact assessment
- Any relevant logs or screenshots (redact secrets)

## Supported Versions
Only the latest version in the main branch is supported for security fixes.

## Security Notes
This codebase includes:
- CSRF protection
- CORS allowlisting
- Helmet headers
- Rate limiting for public and auth endpoints
- Restricted direct browser access to `/api/*` (use `/app/*` via proxy)

Review `.env.example` for required secrets and hardening flags.
