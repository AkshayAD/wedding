# Wedding Invitation V2 - Premium Parallax Experience

A premium, immersive wedding invitation website with Maharashtrian cultural aesthetics, parallax scrolling, and world-class motion design.

## 🚀 Quick Start

Simply open `index.html` in a web browser:

```bash
# Option 1: Direct file
open invitation-v2/index.html

# Option 2: Local server (recommended for best experience)
npx serve .
# Then visit: http://localhost:3000/invitation-v2/
```

## 📁 File Structure

```
invitation-v2/
├── index.html              # Main invitation experience
├── styles/
│   ├── main.css           # Core design system + CSS variables
│   ├── components.css     # Navigation, cards, sections
│   ├── parallax.css       # Motion effects, particles, animations
│   └── responsive.css     # Mobile-first responsive styles
├── scripts/
│   ├── main.js            # Preloader, reveals, accessibility
│   └── parallax.js        # GSAP parallax + floating particles
├── details/
│   ├── index.html         # Travel & Safari information
│   └── details.css        # Details page styles
├── assets/
│   ├── decorative/        # Generated decorative elements
│   └── icons/             # SVG icons
└── README.md              # This file
```

## 🎨 Design System

### Color Palette (Maharashtrian Wedding)
| Variable | Color | Usage |
|----------|-------|-------|
| `--ivory` | #FDF8F3 | Main background |
| `--maroon` | #8B1538 | Primary accent, headings |
| `--saffron` | #E8A435 | Secondary accent |
| `--gold` | #D4AF37 | Highlights, CTAs |
| `--peacock` | #1B6B5F | Tertiary accent |
| `--ink` | #2A1810 | Body text |

### Typography
- **Display:** Cinzel Decorative
- **Headings:** Cinzel
- **Body:** Cormorant Garamond

## ✨ Features

- **Parallax Scrolling** - Multi-layer depth effects with GSAP
- **Floating Particles** - Animated diyas, flowers, and sparkles
- **Marigold Toran** - Subtle swaying garland animation
- **Responsive Design** - Mobile-first, fluid typography
- **Accessibility** - Keyboard navigation, ARIA labels, focus states
- **Reduced Motion** - Respects `prefers-reduced-motion` preference
- **Print-friendly** - Details page optimized for printing

## 🛠 Customization

### Changing Colors
Edit CSS variables in `styles/main.css`:
```css
:root {
  --maroon: #8B1538;  /* Change to your color */
  --gold: #D4AF37;
}
```

### Updating Content
All text content is in `index.html` and `details/index.html`. 
**Important:** Preserve the exact wording per original design requirements.

### Adding Assets
1. Add images to `assets/decorative/`
2. Reference in HTML/CSS as needed
3. Ensure images are optimized (WebP preferred)

## ⚡ Performance

- **Lazy loading** for non-critical images
- **GSAP CDN** for optimized animation library
- **CSS-based** decorative elements where possible
- **Minimal JavaScript** - ~5KB gzipped

### Lighthouse Targets
- LCP: < 2.5s
- CLS: < 0.1
- Accessibility: 100

## ♿ Accessibility

- Skip preloader button
- Semantic HTML structure
- Proper heading hierarchy (h1 → h2 → h3)
- Visible focus states
- Color contrast compliant
- Reduced motion support

## 🔗 Deep Links

| URL | Section |
|-----|---------|
| `#hero` | Hero section |
| `#day-1` | Day 1 events |
| `#day-2` | Day 2 events |
| `#haldi` | Haldi ceremony |
| `#sangeet` | Sangeet night |
| `#barat` | Barat procession |
| `#wedding` | Wedding ceremony |
| `details/#travel` | Travel guide |
| `details/#venue` | Venue info |
| `details/#safari` | Safari details |

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Chrome/Safari

## 📝 Maintenance

### To update event times:
1. Edit time values in `index.html` (search for `<time class="event-time">`)
2. Update corresponding entries in `details/index.html`

### To add new sections:
1. Add HTML section in `index.html`
2. Add styles in `styles/components.css`
3. Update navigation links

---

Built with ❤️ for the Dewalwar-Chachad Wedding
