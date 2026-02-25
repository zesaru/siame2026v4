# Modules

Modular domain folders for incremental migration to a hexagonal architecture.

Each module should separate:
- `domain/`: entities, value objects, domain services, repository ports
- `application/`: use cases, commands, queries, DTOs
- `infrastructure/`: Prisma adapters, mappers, external integrations

During migration, Next.js routes in `app/api/*` should call module use cases instead of Prisma directly.
