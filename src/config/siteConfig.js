
export const siteConfig = {
  // 基本信息
  meta: {
    title: "Sarah & David's Wedding",
    lang: "en",
    description: "Join us in celebrating our love."
  },

  // 封面页配置
  hero: {
    names: {
      groom: "David",
      bride: "Sarah",
      connector: "&" // e.g. "&", "❤️", "and"
    },
    date: "2026-08-28T14:00:00", // ISO string for countdown
    location: "New York City",
    bgImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2000",
    bgAnimation: {
      type: "zoom", // 'zoom', 'fade', 'pan'
      duration: 20, // seconds
      scale: 1.1 // max scale for zoom
    },
    tagline: "The Wedding Of"
  },

  // 故事线配置
  story: {
    title: "Our Love Story",
    subtitle: "The journey that led us to this beautiful moment.",
    events: [
      { 
        year: '2020', 
        title: 'First Meeting', 
        desc: 'We met at a cozy coffee shop in downtown. A simple coffee turned into hours of conversation.',
        image: 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?auto=format&fit=crop&q=80&w=800'
      },
      { 
        year: '2022', 
        title: 'First Trip', 
        desc: 'Our first adventure together to Paris. The city of lights witnessed our growing bond.',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800' 
      },
      { 
        year: '2024', 
        title: 'The Proposal', 
        desc: 'Under the starlit sky on a quiet beach, he got down on one knee, and she said yes.',
        image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800'
      },
      { 
        year: '2026', 
        title: 'The Big Day', 
        desc: 'Today, we celebrate the beginning of our forever with all of you.',
        image: 'https://images.unsplash.com/photo-1511285560982-1356c11d4606?auto=format&fit=crop&q=80&w=800'
      },
    ]
  },

  // 画廊配置
  gallery: {
    title: "Captured Moments",
    subtitle: "Every picture tells a story of love, laughter, and happily ever after.",
    viewMode: "grid", // 'grid', 'masonry', 'carousel'
    images: [
      { 
        src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800', 
        caption: 'The Beginning',
        date: '2020-05'
      },
      { 
        src: 'https://images.unsplash.com/photo-1511285560982-1356c11d4606?auto=format&fit=crop&q=80&w=800',
        caption: 'Our Vows',
        date: '2026-08'
      },
      { 
        src: 'https://images.unsplash.com/photo-1520854221256-17451cc330e7?auto=format&fit=crop&q=80&w=800',
        caption: 'Together Forever',
        date: '2024-12'
      },
      { 
        src: 'https://images.unsplash.com/photo-1522673607200-1645062cd958?auto=format&fit=crop&q=80&w=800',
        caption: 'Adventures',
        date: '2023-06'
      },
      { 
        src: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800',
        caption: 'Celebration',
        date: '2025-01'
      },
      { 
        src: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=800',
        caption: 'Into the Sunset',
        date: '2022-09'
      },
    ]
  },

  // 祝福部分配置
  wishes: {
    title: "Best Wishes",
    subtitle: "Leave your blessings for the happy couple.",
    defaultMessage: "May your love be modern enough to survive the times, but old-fashioned enough to last forever.",
    contact: {
        email: "wedding@example.com",
        phone: "+1 234 567 890"
    }
  },
  
  // 主题与动画配置
  theme: {
    colors: {
      primary: '#e8a8bf',
      secondary: '#fdf2f8',
      accent: '#d4af37',
      text: '#4a4a4a',
    },
    animation: {
      enableParticles: true,
      particleCount: 40, // Reduced count slightly for larger particles
      // Using a Data URI for a Pink Heart to ensure it loads and matches the theme
      particleImage: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e8a8bf'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E",
      particleSize: { min: 20, max: 40 }, // Increased size for better visibility
      interaction: {
        enableMouseTrail: true,
        enableClickExplosion: true,
        enableHoverAttraction: true
      }
    }
  }
};
