export type Product = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  material: string;
  beadSize: string;
  style: string;
  color: string;
  sku: string;
  accent: string;
  features: string[];
};

export const products: Product[] = [
  {
    slug: 'natural-wood-saint-benedict-rosary',
    title: 'Natural Wood Saint Benedict Rosary',
    eyebrow: 'Wood Rosaries',
    summary: 'A warm, tactile rosary concept for gift shops, parish programs, and private-label collections.',
    material: 'Natural wood & zinc alloy',
    beadSize: '8 × 10 mm',
    style: 'Five-decade rosary',
    color: 'Walnut brown',
    sku: 'OUO-DEMO-001',
    accent: '#9b7552',
    features: ['Natural wood character', 'Custom medal options', 'Private-label packaging'],
  },
  {
    slug: 'pearl-glass-first-communion-rosary',
    title: 'Pearl Glass First Communion Rosary',
    eyebrow: 'Ceremony Gifts',
    summary: 'A luminous keepsake direction designed for First Communion gifting and church retail.',
    material: 'Glass pearl & metal',
    beadSize: '8 mm',
    style: 'Five-decade rosary',
    color: 'Ivory pearl',
    sku: 'OUO-DEMO-002',
    accent: '#d9cbb7',
    features: ['Soft pearl finish', 'Gift-ready presentation', 'Color matching available'],
  },
  {
    slug: 'colorful-clay-cross-rosary',
    title: 'Colorful Clay Cross Rosary',
    eyebrow: 'Contemporary Rosaries',
    summary: 'A colorful, approachable rosary concept for youth programs and modern devotional assortments.',
    material: 'Polymer clay & alloy',
    beadSize: '8 mm',
    style: 'Linked rosary',
    color: 'Mixed color',
    sku: 'OUO-DEMO-003',
    accent: '#b66a64',
    features: ['Contemporary palette', 'Multiple colorways', 'Retail packaging options'],
  },
  {
    slug: 'black-stone-rosary-bracelet',
    title: 'Black Stone Rosary Bracelet',
    eyebrow: 'Rosary Bracelets',
    summary: 'A compact devotional bracelet with a restrained look for everyday wear and gifting.',
    material: 'Stone & stainless steel',
    beadSize: '8 mm',
    style: 'Single-decade bracelet',
    color: 'Matte black',
    sku: 'OUO-DEMO-004',
    accent: '#3c4240',
    features: ['Everyday format', 'Adjustable construction', 'Custom charm options'],
  },
];

