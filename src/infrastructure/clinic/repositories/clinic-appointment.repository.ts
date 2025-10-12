import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ClinicAppointment,
  ClinicAppointmentStatus,
  ClinicPaymentStatus,
} from '../../../domain/clinic/types/clinic.types';
import {
  CreateClinicAppointmentInput,
  IClinicAppointmentRepository,
  UpdateClinicAppointmentPaymentStatusInput,
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

  async findByPaymentTransactionId(
    paymentTransactionId: string,
  ): Promise<ClinicAppointment | null> {
    const entity = await this.repository.findOne({ where: { paymentTransactionId } });
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

  async updatePaymentStatus(
    input: UpdateClinicAppointmentPaymentStatusInput,
  ): Promise<ClinicAppointment> {
    type PaymentHistoryEntry = {
      status?: ClinicPaymentStatus;
      gatewayStatus?: string;
      paidAt?: string;
      recordedAt?: string;
      [key: string]: unknown;
    };

    const entity = await this.repository.findOneOrFail({ where: { id: input.appointmentId } });

    entity.paymentStatus = input.paymentStatus;

    const metadata: Record<string, unknown> = { ...(entity.metadata ?? {}) };
    const paymentMetadata =
      typeof metadata.payment === 'object' && metadata.payment !== null
        ? (metadata.payment as Record<string, unknown>)
        : {};

    paymentMetadata.lastStatus = input.paymentStatus;
    if (input.gatewayStatus) {
      paymentMetadata.gatewayStatus = input.gatewayStatus;
      metadata.gatewayStatus = input.gatewayStatus;
    }

    if (input.paidAt) {
      paymentMetadata.paidAt = input.paidAt.toISOString();
    }

    const history = Array.isArray(paymentMetadata.history)
      ? [...(paymentMetadata.history as PaymentHistoryEntry[])]
      : [];
    const normalizedPaidAt = input.paidAt?.toISOString();
    const lastEntry = history.length > 0 ? history[history.length - 1] : undefined;
    const shouldAppend =
      !lastEntry ||
      lastEntry.status !== input.paymentStatus ||
      lastEntry.gatewayStatus !== input.gatewayStatus ||
      lastEntry.paidAt !== normalizedPaidAt;

    const recordedAt = new Date().toISOString();

    if (shouldAppend) {
      history.push({
        status: input.paymentStatus,
        gatewayStatus: input.gatewayStatus,
        paidAt: normalizedPaidAt,
        recordedAt,
      });
    } else {
      history[history.length - 1] = {
        ...lastEntry,
        recordedAt,
      };
    }

    paymentMetadata.history = history;
    paymentMetadata.updatedAt = recordedAt;
    metadata.paymentStatus = input.paymentStatus;
    metadata.payment = paymentMetadata;

    if (input.metadataPatch) {
      Object.assign(metadata, input.metadataPatch);
    }

    entity.metadata = metadata;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toAppointment(saved);
  }
}
