import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap{return process.env.NEXT_PUBLIC_SITE_PHASE==='public-discovery'?['/','/mentors/','/play/','/engagements/','/confidentialite/','/conditions/','/charte/'].map(path=>({url:'https://talentlink.today'+path})):[]}
