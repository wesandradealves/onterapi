import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PatientNotificationService {
  private readonly logger = new Logger(PatientNotificationService.name);

  async sendWelcomeMessage(patientId: string, tenantId: string) {
    this.logger.debug('Queueing welcome message', { patientId, tenantId });
  }

  async notifyTransfer(params: {
    patientId: string;
    tenantId: string;
    fromProfessionalId?: string;
    toProfessionalId: string;
  }) {
    this.logger.debug('Queueing patient transfer notifications', params);
  }

  async notifyArchive(patientId: string, tenantId: string, reason?: string) {
    this.logger.debug('Queueing patient archive notification', { patientId, tenantId, reason });
  }
}
