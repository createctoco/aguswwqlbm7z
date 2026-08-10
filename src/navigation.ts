import { getPermalink } from './utils/permalinks';
import { GENERAL_WHATSAPP_URL } from './config/contact';
import navigationCollections from './data/navigation-collections.json';
import { BUILD_LOCALE } from './i18n/config';
import { ui } from './i18n/ui';

const collectionLinks = (navigationCollections[BUILD_LOCALE] || navigationCollections.en).map(({ name, slug }) => ({
  text: name,
  href: getPermalink(`/collections/${slug}`),
}));

export const headerData = {
  links: [
    { text: 'Products', href: getPermalink('/products') },
    { text: ui('category'), href: getPermalink('/collections'), links: collectionLinks },
    { text: 'Guides', href: getPermalink('/guides') },
    { text: 'About', href: getPermalink('/about') },
    { text: 'Contact', href: getPermalink('/contact') },
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
        { text: ui('category'), href: '/collections' },
        { text: 'Sourcing guides', href: '/guides' },
      ],
    },
    {
      title: 'Sourcing',
      links: [
        { text: 'Stock wholesale', href: '/stock-wholesale' },
        { text: 'Sourcing agent', href: '/sourcing-agent' },
        { text: 'Payment methods', href: '/payment' },
        { text: 'Customization', href: '/customization' },
      ],
    },
    {
      title: 'OUOOO',
      links: [
        { text: 'About', href: '/about' },
        { text: 'Our story', href: '/our-story' },
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
  secondaryLinks: [{ text: 'Privacy Policy', href: '/privacy' }],
  description:
    'An independent B2B sourcing catalog for wholesale rosaries, Catholic gifts, and custom religious products.',
  socialLinks: [],
  footNote: `Copyright © OUOOO.COM All rights reserved. — Catholic Gifts Wholesale`,
};
