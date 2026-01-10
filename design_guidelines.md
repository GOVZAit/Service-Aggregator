# Service Aggregator Design Guidelines

## Design Approach
**Reference-Based:** Drawing from leading marketplace platforms (Airbnb for card layouts, Linear for typography clarity, Thumbtack for service presentation) combined with mobile-first marketplace best practices.

## Core Design Principles
1. **Trust & Credibility First:** Professional presentation with clear verification indicators
2. **Information Density with Breathing Room:** Show critical data without overwhelming
3. **Quick Decision Making:** Enable users to evaluate and choose services rapidly

## Typography System
- **Primary Font:** Inter (Google Fonts) - clean, readable, professional
- **Headings:** 24px/32px (mobile/desktop), font-weight: 700
- **Subheadings:** 18px/20px, font-weight: 600
- **Body:** 15px/16px, font-weight: 400
- **Small/Meta:** 13px/14px, font-weight: 500
- **Number Display (prices/ratings):** font-weight: 700, tabular-nums for alignment

## Layout & Spacing System
**Tailwind Units:** Consistently use 2, 4, 6, 8, 12, 16, 20, 24 (e.g., p-4, gap-6, mb-8)
- **Section Padding:** py-12 mobile, py-20 desktop
- **Card Padding:** p-4 to p-6
- **Grid Gaps:** gap-4 for dense layouts, gap-6 for standard, gap-8 for spacious
- **Container Max-Width:** max-w-7xl for main content

## Component Architecture

### Navigation
- **Fixed Top Bar:** Sticky navigation with search bar, category quick-access, user menu
- **Bottom Tab Bar (Mobile):** Home, Search, Requests (Auction), Orders, Profile
- **Desktop Sidebar:** Persistent category navigation with icons

### Master/Service Cards
- **Card Style:** Rounded-2xl, subtle shadow (shadow-sm hover:shadow-md transition)
- **Image Aspect Ratio:** 4:3 for master avatars within cards, 16:9 for portfolio
- **Card Layout:** Image left (40%) + content right (60%) on desktop; stacked on mobile
- **Badge Positioning:** Verified badge absolute top-right of avatar
- **Information Hierarchy:**
  1. Master name + verification badge (prominent)
  2. Rating stars + review count (highly visible, inline)
  3. Category + distance (secondary, smaller text)
  4. Price (bold, eye-catching)
  5. Response time + completed orders (tertiary, subtle)

### Master Profile Page
- **Hero Section:** Large avatar (120px mobile, 160px desktop), name, category, ratings prominently displayed
- **Tab Navigation:** Services, Portfolio, Reviews (sticky below hero)
- **Portfolio Grid:** 2 columns mobile, 3 columns desktop, equal height images
- **Service List:** Card-based with service name, description, price clearly separated
- **Booking CTA:** Sticky bottom on mobile, prominent right sidebar on desktop

### Category Browse
- **Category Grid:** 4 columns mobile (2x4), 8 columns desktop (single row with horizontal scroll option)
- **Category Cards:** Icon (emoji 32px), name below, subtle border, tap/hover state with scale transform
- **Results Layout:** Masonry-style grid for variety (not strict rows)

### Auction/Request System
- **Request Cards:** Elevated cards (shadow-md) with user avatar, title, budget range, location, response count
- **Bid Interface:** Simple form overlay, master sees request details + bid input
- **Active Bids:** Timeline-style list showing bid progression

### Order Management
- **Status Indicators:** Clear color-coded badges (green=completed, blue=in-progress, gray=pending)
- **Order Cards:** Compact cards with master info, service, date, status, action button
- **Order Details:** Full-screen modal with timeline, chat integration, payment info

### Chat Interface
- **Message Bubbles:** Rounded corners (rounded-2xl), sent messages aligned right, received left
- **Input Area:** Sticky bottom with attachment icon, text input, send button
- **Master Context:** Small header showing master info + quick actions

### Search & Filters
- **Search Bar:** Prominent top placement, with location selector integrated
- **Filter Panel:** Slide-in drawer (mobile), sidebar (desktop)
- **Filter Options:** Price range slider, rating stars, distance radius, service type checkboxes
- **Active Filters:** Chips display below search showing applied filters

## Images
**Hero Section:** NO large hero image - this is a utility app, jump straight to category selection or search
**Master Avatars:** Professional headshots, circular crop, 80px-160px depending on context
**Portfolio Images:** Real work examples, 4:3 or 16:9 aspect ratio, gallery grid presentation
**Category Icons:** Use emoji (provided in code) at 32px-48px size for visual appeal and instant recognition
**Request User Avatars:** Small circular thumbnails (40px-48px) in auction cards
**Background Patterns:** Subtle gradient mesh or dot pattern in empty states only

## Visual Treatments
- **Elevation:** Use sparingly - cards get shadow-sm default, shadow-md on hover/active
- **Borders:** 1px neutral borders for input fields, no borders for cards (use shadow instead)
- **Rounded Corners:** rounded-xl for cards, rounded-full for avatars/badges, rounded-lg for buttons
- **Rating Stars:** Solid fill (#FFB800), 16px size, inline with count
- **Verification Badge:** Blue checkmark icon, 16px, positioned top-right of avatar with -translate offset
- **Transitions:** 150ms ease for most interactions, 200ms for card elevations

## Interaction Patterns
- **Card Taps:** Subtle scale (scale-[0.98]) on press, navigate to detail
- **Button States:** Solid primary buttons with hover brightness adjustment
- **Loading States:** Skeleton screens matching card layouts
- **Empty States:** Centered icon + message + CTA, never blank screens
- **Pull to Refresh:** Mobile native gesture support
- **Infinite Scroll:** Load more cards as user scrolls category/search results

## Responsive Behavior
- **Mobile First:** Design starts at 375px width
- **Breakpoints:** sm:640px, md:768px, lg:1024px, xl:1280px
- **Grid Adjustments:** 1 column → 2 columns (md) → 3 columns (lg) for master cards
- **Navigation Transform:** Bottom tabs mobile → sidebar desktop
- **Typography Scale:** 14-15px mobile body → 16px desktop

This design creates a trustworthy, efficient marketplace where users can quickly find, evaluate, and book service providers while masters can showcase their work and manage requests professionally.