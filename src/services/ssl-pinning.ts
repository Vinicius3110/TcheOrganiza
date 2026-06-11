/**
 * SSL Pinning configuration.
 * In production, replace with actual public key hashes
 * of your Supabase and proxy server domains.
 */
export const SSL_PINNING_CONFIG = {
  'api.seudominio.com': {
    pins: ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='],
    backupPins: ['sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='],
  },
};
