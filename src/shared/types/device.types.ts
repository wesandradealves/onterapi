export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  trustedDevice?: boolean;
}

export interface DeviceMetadata extends DeviceInfo {
  timestamp?: Date;
  sessionId?: string;
}