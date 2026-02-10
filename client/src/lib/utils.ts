import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DESTINATION_SLUG_ORDER = ["riyadh", "jeddah", "taif", "abha", "alula"];

export function sortDestinations<T extends { slug?: string | null }>(destinations: T[]): T[] {
  return [...destinations].sort((a, b) => {
    const idxA = DESTINATION_SLUG_ORDER.indexOf(a.slug || '');
    const idxB = DESTINATION_SLUG_ORDER.indexOf(b.slug || '');
    const orderA = idxA === -1 ? DESTINATION_SLUG_ORDER.length : idxA;
    const orderB = idxB === -1 ? DESTINATION_SLUG_ORDER.length : idxB;
    return orderA - orderB;
  });
}

export function getDestinationSubtitle(
  dest: {
    nameAr?: string | null;
    nameEn?: string | null;
    titleAr?: string | null;
    titleEn?: string | null;
    descriptionAr?: string | null;
    descriptionEn?: string | null;
  },
  language: string
): string {
  const name = language === 'en'
    ? (dest.nameEn?.trim() || dest.nameAr?.trim() || '')
    : (dest.nameAr?.trim() || dest.nameEn?.trim() || '');
  const title = language === 'en'
    ? (dest.titleEn?.trim() || dest.titleAr?.trim() || '')
    : (dest.titleAr?.trim() || dest.titleEn?.trim() || '');
  if (title && title !== name) return title;
  const desc = language === 'en'
    ? (dest.descriptionEn?.trim() || dest.descriptionAr?.trim() || '')
    : (dest.descriptionAr?.trim() || dest.descriptionEn?.trim() || '');
  if (!desc) return '';
  const firstSentence = desc.split(/[.،؟!?\n]/)[0].trim();
  return firstSentence.length > 60 ? firstSentence.substring(0, 57) + '...' : firstSentence;
}

export function getLocalizedName(
  nameAr: string | null | undefined,
  nameEn: string | null | undefined,
  language: string
): string {
  if (language === 'en') {
    return nameEn?.trim() || nameAr?.trim() || '';
  }
  return nameAr?.trim() || nameEn?.trim() || '';
}
