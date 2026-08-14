import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const metadataDefinition = () =>
  z
    .object({
      title: z.string().optional(),
      ignoreTitleTemplate: z.boolean().optional(),

      canonical: z.url().optional(),

      robots: z
        .object({
          index: z.boolean().optional(),
          follow: z.boolean().optional(),
        })
        .optional(),

      description: z.string().optional(),

      openGraph: z
        .object({
          url: z.string().optional(),
          siteName: z.string().optional(),
          images: z
            .array(
              z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional(),
              })
            )
            .optional(),
          locale: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),

      twitter: z
        .object({
          handle: z.string().optional(),
          site: z.string().optional(),
          cardType: z.string().optional(),
        })
        .optional(),
    })
    .optional();

const postCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/post' }),
  schema: z.object({
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),

    title: z.string(),
    excerpt: z.string().optional(),
    image: z.string().optional(),

    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),

    metadata: metadataDefinition(),
  }),
});

const guideCardItem = () =>
  z.object({
    title: z.string(),
    text: z.string(),
    badge: z.string().optional(),
    label: z.string().optional(),
    labelValue: z.string().optional(),
  });

// Guides are technical blog entries rendered under /guides/ from Markdown/MDX.
// Reusable block data lives in the frontmatter so the shared layout can render
// comparison tables, card grids and checklists without page-specific code.
const guideCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/guide' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    excerpt: z.string().optional(),
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),

    comparison: z.array(z.array(z.string())).optional(),
    copyRows: z.array(z.array(z.string())).optional(),
    cardItems: z.array(guideCardItem()).optional(),
    beadMaterials: z.array(guideCardItem()).optional(),
    metalMaterials: z.array(guideCardItem()).optional(),
    marketComparison: z.array(z.array(z.string())).optional(),
    sizeCards: z.array(guideCardItem()).optional(),
    handlingCards: z.array(guideCardItem()).optional(),
    checklist: z.array(z.string()).optional(),
    bulletChecks: z.array(z.string()).optional(),
    aestheticChecks: z.array(z.string()).optional(),
    giftChecks: z.array(z.string()).optional(),

    cta: z
      .object({
        eyebrow: z.string().optional(),
        title: z.string().optional(),
        body: z.string().optional(),
        primaryLabel: z.string().optional(),
        primaryHref: z.string().optional(),
        buttonLabel: z.string().optional(),
        buttonHref: z.string().optional(),
      })
      .optional(),

    metadata: metadataDefinition(),
  }),
});

export const collections = {
  post: postCollection,
  guide: guideCollection,
};
