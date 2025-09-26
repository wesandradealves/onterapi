import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientDetailPatientDto } from './patient-response.dto';

export class PatientDetailSummaryDto {
  @ApiProperty({ description: 'Total de consultas', example: 25 })
  appointments!: number;

  @ApiProperty({ description: 'Consultas concluidas', example: 22 })
  completedAppointments!: number;

  @ApiProperty({ description: 'Cancelamentos', example: 1 })
  cancellations!: number;

  @ApiProperty({ description: 'Receita total (centavos)', example: 1250000 })
  revenue!: number;

  @ApiProperty({ description: 'Pagamentos pendentes (centavos)', example: 35000 })
  pendingPayments!: number;
}

export class PatientDetailDto {
  @ApiProperty({ description: 'Dados do paciente', type: PatientDetailPatientDto })
  patient!: PatientDetailPatientDto;

  @ApiProperty({ description: 'Resumo', type: PatientDetailSummaryDto })
  summary!: {
    totals: PatientDetailSummaryDto;
    alerts: string[];
    retentionScore?: number;
  };

  @ApiProperty({ description: 'Linha do tempo', isArray: true, type: () => Object })
  timeline!: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Insights sugeridos' })
  insights?: {
    nextSteps?: string[];
    followUps?: string[];
    risks?: string[];
  };

  @ApiProperty({ description: 'Acoes rapidas sugeridas', isArray: true, type: String })
  quickActions!: string[];
}
