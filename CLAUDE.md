# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SIAME 2026** is a diplomatic document management system built with Next.js 16, featuring AI-powered document analysis via Azure Document Intelligence. The system manages diplomatic documents including Guías de Valija (diplomatic pouch guides) and Hojas de Remisión (remission sheets).

### Core Features
- **Document Intelligence**: Azure AI Form Recognizer integration for PDF, DOCX, XLSX, and image analysis
- **Authentication**: NextAuth v4 with credentials provider and JWT strategy
- **Diplomatic Document Management**: Specialized handling for Guías de Valija and Hojas de Remisión
- **Dashboard**: Statistics and document tracking interface
- **UI Components**: shadcn/ui with Radix UI primitives

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Database operations
npx prisma generate          # Generate Prisma client
npx prisma db push           # Push schema changes to database
npx prisma migrate dev       # Create and run migrations
npx prisma studio            # Open database browser
```

## Architecture

## Development Rules & Patterns

### 1. Data Access Layer (Prisma)
- **Direct Queries Forbidden**: Components must never call `prisma` directly.
- **Service Pattern**: All DB interactions must reside in `lib/services/`. Create one service file per domain (e.g., `lib/services/pouch-service.ts`).
- **Generated Client**: Always import from `@/app/generated/prisma`. Use the singleton in `lib/db.ts`.

### 2. Next.js 16 & Server Actions
- **Actions over APIs**: Prefer Server Actions (`"use server"`) for mutations instead of Route Handlers (`app/api/`) when triggered by UI forms.
- **Zod Validation**: Every Action and API must validate input using a Zod schema defined in `lib/schemas/`.
- **Error Handling**: Use a consistent return pattern for Actions: `{ success: boolean, data?: T, error?: string }`.

### 3. Tailwind CSS v4 Styles
- **CSS-First**: Use the new Tailwind v4 pattern. Define custom theme variables in `app/globals.css`.
- **Dynamic Classes**: Always use the `cn()` utility (combining `clsx` and `tailwind-merge`) for conditional classes.
- **Layouts**: Follow the "Metronic" inspired design: heavy use of CSS variables for semantic colors (primary, surface, border).

### 4. Diplomatic Logic Standards
- **Document Integrity**: Guías de Valija items and seals (Precintos) must be handled as atomic transactions.
- **Parsing**: All Azure AI extraction logic must be piped through `lib/guias-valija-parser.ts` to ensure consistency before saving to PostgreSQL.
- **Naming Conventions**: Keep Spanish terms for diplomatic concepts (`GuiaValija`, `HojaRemision`) in models and code to maintain alignment with official documentation.

### Database Setup
- **Database**: PostgreSQL (local instance `localhost:5432/siame2026`)
- **ORM**: Prisma 6.19.1
- **Schema Location**: `prisma/schema.prisma` (8 models defined)
- **Generated Client**: Outputs to `app/generated/prisma`
- **Configuration**: Uses `lib/db.ts` with direct Prisma client

### Database Models

| Model | Description |
|-------|-------------|
| `User` | System users with authentication |
| `Account` | NextAuth OAuth account linking |
| `Session` | NextAuth session management |
| `VerificationToken` | Email verification tokens |
| `Document` | General document analysis results |
| `GuiaValija` | Diplomatic pouch guides |
| `GuiaValijaItem` | Items within a pouch guide |
| `GuiaValijaPrecinto` | Seals and airway bills |
| `HojaRemision` | Remission sheets |
| `RemisionItem` | Items within a remission |

### Project Structure

```
app/                              # Next.js App Router
├── api/                          # API Routes
│   ├── analyze/                  # Document analysis endpoint
│   ├── documents/                # Document CRUD operations
│   ├── guias-valija/             # Diplomatic pouch management
│   └── hojas-remision/           # Remission sheet management
├── auth/                         # Authentication pages
│   ├── signin/                   # Login page
│   └── signup/                   # Registration page
├── dashboard/                    # Main dashboard
├── documents/                    # Document management interface
├── guias-valija/                 # Diplomatic pouch UI
├── hojas-remision/               # Remission sheets UI
├── generated/prisma/             # Prisma client (generated)
├── globals.css                   # Tailwind v4 styles
├── layout.tsx                    # Root layout with providers
└── page.tsx                      # Landing page

components/                       # React components
├── cards/                        # Statistic cards
├── dashboard/                    # Dashboard-specific components
├── ui/                           # shadcn/ui components (19 components)
├── DocumentHistory.tsx           # Document history display
├── DocumentResults.tsx           # Analysis results display
├── DocumentUpload.tsx            # File upload with drag-drop
└── providers.tsx                 # Theme and session providers

lib/                             # Utilities and integrations
├── auth-v4.ts                   # NextAuth configuration
├── dashboard.ts                 # Dashboard data aggregation
├── db.ts                        # Prisma client singleton
├── document-intelligence.ts     # Azure AI integration
├── guias-valija-parser.ts       # Diplomatic document parser
└── utils.ts                     # Common utilities

prisma/                          # Database configuration
├── schema.prisma                # Complete schema definition
└── migrations/                  # Database migrations
    ├── 20251223030818_init/
    └── 20251223060555_add_diplomatic_documents/

pages/                           # Next.js Pages directory (NextAuth)
└── api/
    └── auth/[...nextauth]/      # NextAuth API handler

public/                          # Static assets
```

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework |
| React | 19.2.3 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | v4 | Styling |
| Prisma | 6.19.1 | ORM |
| PostgreSQL | - | Database |
| NextAuth | 4.24.8 | Authentication |
| Azure AI Form Recognizer | 5.1.0 | Document analysis |
| shadcn/ui | latest | UI components |
| Radix UI | latest | Component primitives |
| Sonner | 2.0.7 | Notifications |
| react-dropzone | 14.3.8 | File uploads |

### Key Configuration Details

#### Next.js Config
- Turbopack disabled (symlink compatibility)
- TypeScript errors ignored in dev mode
- App Router enabled

#### Tailwind CSS v4
- PostCSS plugin integration
- Custom CSS variables for theming
- Dark mode via media query
- Metronic-inspired design system

#### Authentication
- Credentials provider
- JWT strategy
- Demo user: `demo@example.com` / `temp123`
- Password hashing with bcryptjs (production)

#### Azure Document Intelligence
- Model: `prebuilt-document` (general document analysis)
- Supported formats: PDF, DOCX, XLSX, PNG, JPG, JPEG
- Features: Tables, key-value pairs, entities extraction

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | - | NextAuth handler |
| `/api/analyze` | POST | Analyze document with Azure AI |
| `/api/documents` | GET/POST | List/create documents |
| `/api/documents/[id]` | GET/DELETE | View/delete document |
| `/api/guias-valija` | GET/POST | List/create pouch guides |
| `/api/guias-valija/[id]` | GET | View pouch guide |
| `/api/hojas-remision` | GET/POST | List/create remission sheets |
| `/api/hojas-remision/[id]` | GET | View remission sheet |

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/siame2026
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_FORM_RECOGNIZER_KEY=your-key-here
```

## Database Development Workflow

1. **Schema Definition**: Edit `prisma/schema.prisma` to define/modify models
2. **Generate Client**: Run `npx prisma generate` to update client in `app/generated/prisma`
3. **Apply Changes**: Use `npx prisma db push` for development or `npx prisma migrate dev` for migrations
4. **Browse Data**: Use `npx prisma studio` for visual database management

### Executed Migrations

| Migration ID | Description |
|--------------|-------------|
| `20251223030818_init` | Initial schema with auth and Document model |
| `20251223060555_add_diplomatic_documents` | Added GuiaValija, HojaRemision, and related models |

## PostgreSQL Access

- **Installation Path**: `C:\Program Files\PostgreSQL\18\`
- **Binary Path**: `C:\Program Files\PostgreSQL\18\bin\`
- **Service Name**: `postgresql-x64-18`
- **Database**: `siame2026`
- **Direct Access**: `"C:\Program Files\PostgreSQL\18\bin\psql.exe" -d siame2026`

## Current State

- **Authentication**: Fully implemented with NextAuth v4
- **Database**: Schema complete with 8+ models, migrations applied
- **Document Intelligence**: Azure AI integration functional
- **UI**: Complete dashboard with shadcn/ui components
- **API Routes**: RESTful endpoints for all resources
- **Development**: Active development, production-ready core features

## Development Notes

- The project uses modern Next.js App Router patterns throughout
- Server components preferred over client components where possible
- All database queries use the singleton Prisma client from `lib/db.ts`
- UI components follow shadcn/ui patterns with custom theming
- Document analysis results are stored as JSON in the database
- Demo credentials available for testing without email verification

## Future Enhancements

- Email verification flow
- Role-based access control (RBAC)
- Advanced document filtering and search
- Export functionality (PDF, Excel)
- Document versioning
- Audit trail for sensitive operations
- Multi-language support
- File storage optimization (Azure Blob Storage)
