import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClinicAppointment, ClinicAppointmentStatus } from '../../../domain/clinic/types/clinic.types';
import {
  CreateClinicAppointmentInput,
  IClinicAppointmentRepository,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { ClinicAppointmentEntity } from '../entities/clinic-appointment.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicAppointmentRepository implements IClinicAppointmentRepository {
  constructor(
    @InjectRepository(ClinicAppointmentEntity)
    private readonly repository: Repository<ClinicAppointmentEntity>,
  ) {}

  async create(input: CreateClinicAppointmentInput): Promise<ClinicAppointment> {
    const entity = this.repository.create({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      holdId: input.holdId,
      professionalId: input.professionalId,
      patientId: input.patientId,
      serviceTypeId: input.serviceTypeId,
      startAt: input.start,
      endAt: input.end,
      status: 'scheduled',
      paymentStatus: input.paymentStatus,
      paymentTransactionId: input.paymentTransactionId,
      confirmedAt: input.confirmedAt,
      metadata: input.metadata ?? {},
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toAppointment(saved);
  }

  async findByHoldId(holdId: string): Promise<ClinicAppointment | null> {
    const entity = await this.repository.findOne({ where: { holdId } });
    return entity ? ClinicMapper.toAppointment(entity) : null;
  }

  async findActiveOverlap(params: {
    tenantId: string;
    professionalId: string;
    start: Date;
    end: Date;
    excludeAppointmentId?: string;
  }): Promise<ClinicAppointment[]> {
    const scheduledStatus: ClinicAppointmentStatus = 'scheduled';

    const query = this.repository
      .createQueryBuilder('appointment')
      .where('appointment.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('appointment.professional_id = :professionalId', {
        professionalId: params.professionalId,
      })
      .andWhere('appointment.status = :status', { status: scheduledStatus })
      .andWhere('appointment.start_at < :end', { end: params.end })
      .andWhere('appointment.end_at > :start', { start: params.start });

    if (params.excludeAppointmentId) {
      query.andWhere('appointment.id <> :excludeAppointmentId', {
        excludeAppointmentId: params.excludeAppointmentId,
      });
    }

    const entities = await query.getMany();
    return entities.map(ClinicMapper.toAppointment);
  }
}
