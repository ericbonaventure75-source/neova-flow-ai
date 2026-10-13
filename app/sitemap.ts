import type {MetadataRoute} from 'next';
import {siteOrigin, publicPaths} from '@/lib/config';
export default function sitemap():MetadataRoute.Sitemap { return publicPaths.map(path=>({url:siteOrigin+path,changeFrequency:'monthly',priority:path===''?1:['/mentions-legales','/confidentialite','/cookies'].includes(path)?0.2:0.8})); }
