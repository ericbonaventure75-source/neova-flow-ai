import type {NextConfig} from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() { return [{source:'/:path*',has:[{type:'host',value:'www.neovaflowai.com'}],destination:'https://neovaflowai.com/:path*',permanent:true}]; },
  async headers() { return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"}
  ]}]; }
};
export default nextConfig;
