/**
 * Sentry error monitoring configuration.
 *
 * The @sentry/react-native package must be installed:
 *   npx expo install @sentry/react-native
 *
 * Without EXPO_PUBLIC_SENTRY_DSN, the service is a no-op — safe for
 * development without Sentry credentials.
 */
import { Platform } from 'react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let SentryModule: typeof import('@sentry/react-native') | null = null;

function getSentry() {
  if (!SENTRY_DSN) return null;
  if (SentryModule) return SentryModule;
  try {
    SentryModule = require('@sentry/react-native');
    return SentryModule;
  } catch {
    return null;
  }
}

export function initSentry(): void {
  const Sentry = getSentry();
  if (!Sentry) return;

  Sentry.init({
    dsn: SENTRY_DSN!,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    enableNative: true,
    enableNativeCrashHandling: Platform.OS !== 'web',

    // Sanitize sensitive data before sending to Sentry
    beforeSend(event) {
      if (event.extra) {
        delete event.extra.transactionData;
        delete event.extra.userToken;
        delete event.extra.cpf;
        delete event.extra.cnpj;
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.data && typeof crumb.data === 'object') {
            const { transactionData, userToken, cpf, cnpj, ...safe } = crumb.data as Record<string, unknown>;
            return { ...crumb, data: safe };
          }
          return crumb;
        });
      }
      return event;
    },

    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,
  });
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  const Sentry = getSentry();
  if (!Sentry) {
    if (__DEV__) console.warn('[Sentry] Not configured — error not reported:', error.message);
    return;
  }
  Sentry.captureException(error, { extra: context });
}
