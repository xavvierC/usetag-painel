import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Allow the local preview to load HMR assets from the same Wi-Fi device.
  allowedDevOrigins: ['127.0.0.1', '192.168.15.13'],
  async headers() {
    return [{source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'DENY'}
    ]}];
  }
};
export default config;
