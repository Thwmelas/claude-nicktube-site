import type { ImageMetadata } from 'astro';

// Κάθε editorial είναι ένας φάκελος μέσα στο src/editorials/ με:
//   - τις φωτογραφίες του (εμφανίζονται με αλφαβητική σειρά ονόματος αρχείου)
//   - ένα editorial.json με τίτλο, εικόνα εξωφύλλου και προαιρετικά περιοδικό, μοντέλα, κείμενο

export const categories = ['covers', 'editorials'] as const;
export type Category = (typeof categories)[number];

type EditorialInfo = {
  title: string;
  cover: string;
  description?: string;
  magazine?: string;
  models?: string;
  text?: string;
  order?: number;
  category?: Category;
  magazineOrder?: number;
};

export type Editorial = {
  slug: string;
  title: string;
  description?: string;
  magazine?: string;
  models?: string;
  text?: string;
  order: number;
  category: Category;
  magazineOrder: number;
  cover: ImageMetadata;
  photos: ImageMetadata[];
};

const infos = import.meta.glob<EditorialInfo>('../editorials/*/editorial.json', {
  eager: true,
  import: 'default',
});

const images = import.meta.glob<ImageMetadata>(
  '../editorials/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true, import: 'default' },
);

const folderOf = (path: string) => path.split('/').at(-2)!;
const fileOf = (path: string) => path.split('/').at(-1)!;
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export function getEditorials(): Editorial[] {
  return Object.entries(infos)
    .map(([path, info]) => {
      const slug = folderOf(path);
      const files = Object.keys(images)
        .filter((p) => folderOf(p) === slug)
        .sort((a, b) => byName(fileOf(a), fileOf(b)));

      if (!info.title) {
        throw new Error(`src/editorials/${slug}/editorial.json: λείπει το "title".`);
      }
      const coverPath = files.find((p) => fileOf(p) === info.cover);
      if (!coverPath) {
        throw new Error(
          `src/editorials/${slug}/editorial.json: η εικόνα εξωφύλλου "${info.cover}" δεν βρέθηκε στον φάκελο.`,
        );
      }
      const category = info.category ?? 'editorials';
      if (!categories.includes(category)) {
        throw new Error(
          `src/editorials/${slug}/editorial.json: το "category" πρέπει να είναι ${categories.map((c) => `"${c}"`).join(' ή ')}.`,
        );
      }

      return {
        slug,
        title: info.title,
        description: info.description,
        magazine: info.magazine,
        models: info.models,
        text: info.text,
        order: info.order ?? Number.MAX_SAFE_INTEGER,
        category,
        magazineOrder: info.magazineOrder ?? Number.MAX_SAFE_INTEGER,
        cover: images[coverPath],
        photos: files.map((p) => images[p]),
      };
    })
    .sort((a, b) => a.order - b.order || byName(a.title, b.title));
}

// Τα editorials μιας κατηγορίας της σελίδας Magazines, με τη δική τους σειρά (magazineOrder).
export function inCategory(editorials: Editorial[], category: Category): Editorial[] {
  return editorials
    .filter((e) => e.category === category)
    .sort((a, b) => a.magazineOrder - b.magazineOrder || a.order - b.order);
}
