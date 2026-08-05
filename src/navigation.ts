import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'Products', href: getPermalink('/products') },
    { text: 'Collections', href: getPermalink('/products') },
    { text: 'Materials', href: getPermalink('/guides/choosing-rosary-materials') },
    { text: 'Customization', href: getPermalink('/contact') },
    { text: 'Guides', href: getPermalink('/guides') },
    { text: 'About', href: getPermalink('/about') },
  ],
  actions: [{ text: 'Request a Quote', href: getPermalink('/contact') }],
};

export const footerData = {
  links: [
    { title: 'Discover', links: [{ text: 'All products', href: '/products' }, { text: 'Rosary bracelets', href: '/products' }, { text: 'Ceremony gifts', href: '/products' }] },
    { title: 'Sourcing', links: [{ text: 'Materials guide', href: '/guides/choosing-rosary-materials' }, { text: 'Bead size guide', href: '/guides/8mm-vs-10mm-beads' }, { text: 'Customization', href: '/contact' }] },
    { title: 'Ouooo', links: [{ text: 'About', href: '/about' }, { text: 'Contact', href: '/contact' }, { text: 'Privacy', href: '/privacy' }] },
  ],
  secondaryLinks: [{ text: 'Terms', href: '/terms' }, { text: 'Privacy Policy', href: '/privacy' }],
  socialLinks: [],
  footNote: `OUOOO — Curated rosaries, devotional jewelry, and custom religious gifts.`,
};

