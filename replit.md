# GOVZAservice

## Overview

A Russian-language service marketplace application (GOVZAservice) connecting customers with local service providers (masters) for various services like plumbing, electrical work, cleaning, repairs, beauty services, and more. The platform follows a mobile-first design approach inspired by Airbnb, Linear, and Thumbtack, enabling users to browse service providers, view profiles with portfolios, submit service requests, and manage orders.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React useState for local state
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Build Tool**: Vite with React plugin

**Component Structure**:
- `/client/src/pages/` - Page-level components (home, master-profile, requests, orders, profile, city-services)
- `/client/src/components/` - Reusable components (cards, navigation)
- `/client/src/components/ui/` - shadcn/ui base components
- `/client/src/hooks/` - Custom React hooks
- `/client/src/lib/` - Utilities and data (including `city-services-data.ts`)

**Design System**:
- Mobile-first with bottom tab navigation
- Card-based layouts with hover/active elevation effects
- Inter font family for typography
- Consistent spacing using Tailwind's 2, 4, 6, 8, 12, 16, 20, 24 unit scale

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API under `/api/*` prefix
- **Development**: Vite dev server with HMR proxied through Express

**API Endpoints**:
- `GET /api/categories` - Service categories list
- `GET /api/masters` - List masters (with optional categoryId/search filters)
- `GET /api/masters/:id` - Single master details
- `GET /api/requests` - Service requests (auction-style)
- `GET /api/requests/:id` - Single request details

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `/shared/schema.ts` (shared between client and server)
- **Current Storage**: In-memory mock data in `/server/storage.ts`
- **Validation**: Zod schemas with drizzle-zod integration

**Data Models**:
- Categories (static list with icons and colors)
- Masters (service providers with profile, portfolio, services, ratings)
- ServiceRequests (customer requests for bidding)
- Orders (booked services with status tracking)
- ChatMessages (in-profile messaging)

### Call Availability System
Each master has a `callMode` field controlling when their phone number is active for clients:
- `always` — Кнопка "Позвонить" активна 24/7
- `schedule` — Активна только в рабочие часы (`workingHours.from`–`workingHours.to`)
- `online_only` — Активна только пока онлайн-переключатель включён (`isOnline: true`)
- `disabled` — Звонки полностью отключены; клиент видит "Звонки откл."

Client-facing master profile shows the call button state with contextual hints ("Офлайн", "Принимает звонки 09:00–18:00", etc). Clicking "Позвонить" reveals the number, second click opens tel: link.

Executor sets their phone, callMode, and working hours in the `/master/profile` availability section.

### Broadcast Request (Автопоиск)
Clients can tap "Найти" on the home page banner to open a 3-step wizard:
1. Category selection
2. Description + budget
3. Address + summary

On submit, calls `POST /api/requests` which stores the request visible to ALL masters in that category. First master to accept from their orders queue gets the job.
New requests appear at the top of the `/api/requests` list (reversed order).

### Authentication & Roles
- **Session-based auth** with express-session (SESSION_SECRET env var)
- **Password hashing**: bcryptjs
- **Registration**: name + phone number + password + role (POST /api/auth/register)
- **Login**: phone number + password (POST /api/auth/login)
- **Session check**: GET /api/auth/me (returns current user with role or 401)
- **Logout**: POST /api/auth/logout
- **Frontend**: AuthContext at `client/src/contexts/auth-context.tsx` wraps entire app
- **Auth page**: `/auth` with Вход/Регистрация tab toggle; supports `?tab=register`; role selector cards (Клиент / Исполнитель) on registration
- **Roles**: `UserRole = 'client' | 'master'` — stored in AuthUser, returned in PublicUser
- **Role routing**: `RoleGuard` component in App.tsx auto-redirects based on role after login; masters → `/master`, clients → `/`

### Executor (Master) Interface
Routes under `/master` prefix — completely separate from client interface:
- `/master` — Dashboard: online toggle, stats (views/orders/earnings), new incoming requests, quick tips
- `/master/orders` — Заявки with 3 tabs: Новые (accept/decline), Активные (call client), Завершённые (with reviews)  
- `/master/profile` — Профиль: avatar, description editor, category selector, services list, portfolio grid, theme toggle, logout
- **Bottom navigation**: `client/src/components/master-bottom-navigation.tsx` — 3 tabs (Главная/Заявки/Профиль)
- **RoleGuard**: Executors redirected to `/master` if they visit client routes; clients redirected to `/` if they visit executor routes
- Route ordering: executor routes declared before `/master/:id` in Switch to avoid parameterized route conflicts

### Build System
- **Development**: `npm run dev` - tsx runs server with Vite middleware
- **Production Build**: `npm run build` - Vite builds client, esbuild bundles server
- **Database Migrations**: `npm run db:push` - Drizzle Kit push to PostgreSQL

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle Kit**: Schema migrations and database management
- **connect-pg-simple**: Session storage for Express sessions

### Frontend Libraries
- **@tanstack/react-query**: Data fetching and caching
- **Radix UI**: Accessible UI primitives (dialog, dropdown, tabs, etc.)
- **class-variance-authority**: Variant-based component styling
- **embla-carousel-react**: Carousel/slider functionality
- **date-fns**: Date formatting and manipulation
- **lucide-react**: Icon library
- **wouter**: Client-side routing
- **react-hook-form** with **zod**: Form handling and validation

### Development Tools
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Server bundling for production
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type safety across the stack

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator