/**
 * Entidade de domínio Permission
 * Representa uma permissão granular no sistema
 */
export class Permission {
  id!: string;
  userId!: string;
  permission!: string;
  resource?: string;
  tenantId?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Permission>) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
    this.updatedAt = partial.updatedAt ?? new Date();
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt < new Date();
  }

  matches(requiredPermission: string, requiredResource?: string): boolean {
    if (this.isExpired()) return false;
    
    const permissionMatches = this.permission === requiredPermission || 
                             this.permission === '*';
    
    if (!requiredResource) return permissionMatches;
    
    const resourceMatches = !this.resource || 
                           this.resource === requiredResource || 
                           this.resource === '*';
    
    return permissionMatches && resourceMatches;
  }

  belongsToTenant(tenantId: string): boolean {
    return !this.tenantId || this.tenantId === tenantId;
  }
}