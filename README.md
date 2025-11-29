# Nigeria Security Alert

A premium, professional security intelligence platform for Nigeria. Built with Next.js 14, Tailwind CSS, and Framer Motion.

**Live at:** [alerts.thinknodes.com](https://alerts.thinknodes.com)

## Features

- **State & LGA Security Information** - Detailed risk assessments for all 36 states and their LGAs
- **Road Safety Checker** - Check any route before you travel
- **Emergency Contacts Database** - Quick access to police and emergency numbers
- **Incident Tracking** - Recent security incidents with verified data
- **Kidnapping Response Guide** - What to do if someone is kidnapped
- **Mobile-Responsive Design** - Beautiful on all devices

## Tech Stack

- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icons
- **TypeScript** - Type safety

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── location/[state]/  # State detail pages
│   ├── lga/[state]/[lga]/ # LGA detail pages
│   ├── roads/             # Roads listing
│   ├── road/[slug]/       # Road detail pages
│   ├── emergency/         # Emergency contacts
│   ├── guide/kidnapping/  # Kidnapping guide
│   ├── about/             # About page
│   ├── roadmap/           # Product roadmap
│   └── support/           # Support page
├── components/
│   ├── animations/        # Animation components
│   ├── layout/            # Navigation, mobile nav
│   └── ui/                # Reusable UI components
└── data/                  # Static data files
    ├── states.ts          # States and LGAs data
    ├── roads.ts           # Dangerous roads data
    ├── incidents.ts       # Recent incidents
    └── statistics.ts      # Platform statistics
```

## Design System

### Colors
- **Risk Levels:**
  - Extreme: `#dc2626` (red)
  - Very High: `#ea580c` (orange)
  - High: `#ca8a04` (yellow)
  - Moderate: `#16a34a` (green)

### Typography
- **Font Family:** Inter (Google Fonts)
- **Mono Font:** JetBrains Mono (for numbers)

### Animations
- Page transitions (fade + slide)
- Staggered list reveals
- Number counting animation
- Card hover effects
- Risk badge pulse (EXTREME only)

## Deployment

Deploy to Vercel:

```bash
npm run build
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Data Sources

- ACLED (Armed Conflict Location & Event Data Project)
- Human Rights Watch
- Amnesty International
- Verified local reports

## License

This is a not-for-profit project by [Thinknodes Innovation Lab](https://thinknodes.com).

## Contact

- Email: akin@thinknodes.com
- Website: [thinknodes.com](https://thinknodes.com)


