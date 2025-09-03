export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  platform?: string;
  browser?: string;
  version?: string;
  os?: string;
  device?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  timestamp?: Date;
}