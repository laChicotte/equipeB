import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return process.env.NEXT_PUBLIC_SITE_PHASE==='public-discovery'?{rules:{userAgent:'*',allow:'/',disallow:['/auth/','/compte/','/administration/','/api/']},sitemap:'https://talentlink.today/sitemap.xml'}:{rules:{userAgent:'*',disallow:'/'}}}
