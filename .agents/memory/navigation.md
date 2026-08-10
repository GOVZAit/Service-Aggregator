---
name: Bottom nav is the only navigation
description: Why the client bottom navigation must stay visible on all breakpoints
---
The client app's only navigation between sections (Мастера / Службы / Врачи / Контакты / Профиль) is `BottomNavigation`. On lg+ it renders as a floating centered dock instead of being hidden.

**Why:** A desktop-layout task once hid it with `lg:hidden` and the user complained that «мастера, службы, контакты» were "removed" — the sections became unreachable on wide screens.

**How to apply:** Never hide `BottomNavigation` per breakpoint without providing an equivalent desktop nav; pages need enough bottom padding (~pb-24/pb-28) so the dock doesn't cover content.
