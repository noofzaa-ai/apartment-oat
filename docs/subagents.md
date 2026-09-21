# Subagent Roles

## frontend
- Own UI/UX, Next.js pages, components, and styling.
- Coordinate API/data contract needs with backend or PO.

## backend
- Own API routes, server logic, auth, and integrations.
- Coordinate schema/data changes with dba before implementation.

## dba
- Own database schema, Prisma migrations, indexes, and query performance.
- Protect data integrity; review migration risk before changes.

## qa
- Own testing, verification, and bug reports.
- Use `npm run test`; do not change product code unless asked.

## devops
- Own Docker, deployment, environment, and build verification.
- Use `docker-compose` only; do not deploy unless explicitly told.
