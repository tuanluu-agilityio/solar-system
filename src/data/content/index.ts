import type { BodyContent, ContentId, Lang } from '../types';
import { CONTENT_EN } from './en';
import { CONTENT_VI } from './vi';

export { CONTENT_EN, CONTENT_VI };

const CONTENT: Record<Lang, Record<ContentId, BodyContent>> = {
  vi: CONTENT_VI,
  en: CONTENT_EN,
};

export function getContent(id: ContentId, lang: Lang): BodyContent {
  return CONTENT[lang][id];
}
