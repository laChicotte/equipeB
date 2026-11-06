import type { NextConfig } from 'next';
const config: NextConfig = {
 trailingSlash: true,
 poweredByHeader: false,
 async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'}]}]},
 // Local sandbox workaround only; ordinary builds still clean their output.
 cleanDistDir: process.env.TALENTLINK_KEEP_BUILD_OUTPUT !== 'true',
 serverExternalPackages: ['pg', 'nodemailer', '@electric-sql/pglite', '@neondatabase/serverless'],
};
export default config;
