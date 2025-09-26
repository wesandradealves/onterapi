import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PatientAuditService {
  private readonly logger = new Logger(PatientAuditService.name);

  async register(event: string, detail: Record<string, unknown>) {
    this.logger.log(`Audit event: ${event}`, detail);
  }
}
