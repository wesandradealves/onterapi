export const EVENT_NAMES = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',

  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REGISTER: 'auth.register',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_PASSWORD_RESET: 'auth.password.reset',
  AUTH_PASSWORD_CHANGED: 'auth.password.changed',
  AUTH_EMAIL_VERIFIED: 'auth.email.verified',
  AUTH_TWO_FA_ENABLED: 'auth.two_fa.enabled',
  AUTH_TWO_FA_DISABLED: 'auth.two_fa.disabled',
  AUTH_TWO_FA_SENT: 'auth.two_fa.sent',
  AUTH_TWO_FA_VALIDATED: 'auth.two_fa.validated',
  AUTH_TWO_FA_FAILED: 'auth.two_fa.failed',

  SESSION_CREATED: 'session.created',
  SESSION_EXPIRED: 'session.expired',
  SESSION_REVOKED: 'session.revoked',

  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',

  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_DELETED: 'tenant.deleted',
};

export const EVENT_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  CRITICAL: 10,
};

export const EVENT_CATEGORIES = {
  USER: 'user',
  AUTH: 'authentication',
  SESSION: 'session',
  PERMISSION: 'permission',
  TENANT: 'tenant',
  AUDIT: 'audit',
  SYSTEM: 'system',
};
