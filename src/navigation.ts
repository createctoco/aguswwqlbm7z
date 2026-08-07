import { getPermalink } from './utils/permalinks';
import { GENERAL_WHATSAPP_URL } from './config/contact';

export const headerData = {
  links: [
    { text: 'Products', href: getPermalink('/products') },
    { text: 'Collections', href: getPermalink('/collections') },
    { text: 'Materials', href: getPermalink('/guides/choosing-rosary-materials') },
    { text: 'Contact', href: getPermalink('/contact') },
    { text: 'Guides', href: getPermalink('/guides') },
    { text: 'About', href: getPermalink('/about') },
  ],
  actions: [
    {
      text: 'Chat on WhatsApp',
      href: GENERAL_WHATSAPP_URL,
      target: '_blank',
      ariaLabel: 'Chat with OUOOO on WhatsApp',
    },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Discover',
      links: [
        { text: 'All products', href: '/products' },
        { text: 'Collections', href: '/collections' },
        { text: 'Sourcing guides', href: '/guides' },
      ],
    },
    {
      title: 'Sourcing',
      links: [
        { text: 'Materials guide', href: '/guides/choosing-rosary-materials' },
        { text: 'Bead size guide', href: '/guides/8mm-vs-10mm-beads' },
        { text: 'Customization', href: '/customization' },
      ],
    },
    {
      title: 'OUOOO',
      links: [
        { text: 'About', href: '/about' },
        { text: 'Platform overview', href: '/terms' },
        { text: 'Contact', href: '/contact' },
        { text: 'Privacy', href: '/privacy' },
      ],
    },
    {
      title: 'Help Center',
      links: [
        { text: 'Help & FAQ', href: '/help' },
        { text: 'Customization', href: '/customization' },
        { text: 'Return policy', href: '/returns' },
        { text: 'Contact support', href: '/contact' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Platform Overview', href: '/terms' },
    { text: 'Privacy Policy', href: '/privacy' },
  ],
  description:
    'An independent B2B sourcing catalog for wholesale rosaries, Catholic gifts, and custom religious products.',
  socialLinks: [],
  footNote: `Copyright © OUOOO.COM All rights reserved. — Catholic Gifts Wholesale`,
};
