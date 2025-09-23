import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PatientAISuggestionsService {
  private readonly logger = new Logger(PatientAISuggestionsService.name);

  async getInsights(patientId: string, tenantId: string) {
    this.logger.debug('Generating AI insights (stub)', { patientId, tenantId });
    return {
      nextSteps: [],
      followUps: [],
      risks: [],
    };
  }
}
