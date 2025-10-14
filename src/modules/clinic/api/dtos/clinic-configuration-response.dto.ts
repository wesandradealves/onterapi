import { ApiProperty } from '@nestjs/swagger';

export class ClinicConfigurationTelemetryResponseDto {
  @ApiProperty({ enum: ['idle', 'saving', 'saved', 'error'] })
  state!: 'idle' | 'saving' | 'saved' | 'error';

  @ApiProperty({ description: 'Score de completude (0 a 100)' })
  completionScore!: number;

  @ApiProperty({ description: 'Ultima tentativa de salvamento', type: String, required: false })
  lastAttemptAt?: Date;

  @ApiProperty({ description: 'Ultimo salvamento bem sucedido', type: String, required: false })
  lastSavedAt?: Date;

  @ApiProperty({ description: 'Ultimo erro registrado', type: String, required: false })
  lastErrorAt?: Date;

  @ApiProperty({ description: 'Mensagem do ultimo erro', required: false })
  lastErrorMessage?: string;

  @ApiProperty({ description: 'Ultimo usuario que alterou', required: false })
  lastUpdatedBy?: string;

  @ApiProperty({ description: 'Intervalo de autosave em segundos', required: false })
  autosaveIntervalSeconds?: number;

  @ApiProperty({ description: 'Quantidade de conflitos pendentes', required: false })
  pendingConflicts?: number;
}

export class ClinicConfigurationVersionResponseDto {
  @ApiProperty({ description: 'Identificador da versao' })
  id!: string;

  @ApiProperty({ description: 'Identificador da clinica' })
  clinicId!: string;

  @ApiProperty({ description: 'Secao configurada', example: 'general' })
  section!: string;

  @ApiProperty({ description: 'Numero da versao' })
  version!: number;

  @ApiProperty({ description: 'Usuario responsavel pela alteracao' })
  createdBy!: string;

  @ApiProperty({ description: 'Data de criacao da versao', type: String })
  createdAt!: Date;

  @ApiProperty({ description: 'Data de aplicacao da versao', type: String, required: false })
  appliedAt?: Date;

  @ApiProperty({ description: 'Notas associadas', required: false })
  notes?: string;

  @ApiProperty({ enum: ['idle', 'saving', 'saved', 'error'] })
  state!: 'idle' | 'saving' | 'saved' | 'error';

  @ApiProperty({ description: 'Indica se a versao e aplicada automaticamente' })
  autoApply!: boolean;

  @ApiProperty({
    description: 'Telemetria associada a configuracao',
    type: ClinicConfigurationTelemetryResponseDto,
    required: false,
  })
  telemetry?: ClinicConfigurationTelemetryResponseDto;

  @ApiProperty({ description: 'Payload salvo da configuracao' })
  payload!: Record<string, unknown>;
}
