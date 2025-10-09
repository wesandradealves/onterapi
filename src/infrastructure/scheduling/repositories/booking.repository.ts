import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { Between, DataSource, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

import {
  Booking,
  MarkNoShowInput,
  NewBooking,
  RecordPaymentStatusInput,
  RescheduleBookingInput,
  UpdateBookingStatusInput,
} from "../../../domain/scheduling/types/scheduling.types";
import { IBookingRepository } from "../../../domain/scheduling/interfaces/repositories/booking.repository.interface";
import { BookingEntity } from "../entities/booking.entity";
import { mapBookingEntityToDomain } from "../../../shared/mappers/scheduling.mapper";

@Injectable()
export class BookingRepository implements IBookingRepository {
  private readonly logger = new Logger(BookingRepository.name);
  private readonly repository: Repository<BookingEntity>;

  constructor(@InjectDataSource() dataSource: DataSource) {
    this.repository = dataSource.getRepository(BookingEntity);
  }

  async create(data: NewBooking): Promise<Booking> {
    const entity = this.repository.create({
      tenantId: data.tenantId,
      clinicId: data.clinicId,
      professionalId: data.professionalId,
      patientId: data.patientId,
      source: data.source,
      status: data.status,
      paymentStatus: data.paymentStatus,
      holdId: data.holdId ?? null,
      holdExpiresAtUtc: data.holdExpiresAtUtc ?? null,
      startAtUtc: data.startAtUtc,
      endAtUtc: data.endAtUtc,
      timezone: data.timezone,
      lateToleranceMinutes: data.lateToleranceMinutes,
      recurrenceSeriesId: data.recurrenceSeriesId ?? null,
      cancellationReason: data.cancellationReason ?? null,
      pricingSplit: data.pricingSplit ?? null,
      preconditionsPassed: data.preconditionsPassed,
      anamneseRequired: data.anamneseRequired,
      anamneseOverrideReason: data.anamneseOverrideReason ?? null,
      noShowMarkedAtUtc: data.noShowMarkedAtUtc ?? null,
    });

    const saved = await this.repository.save(entity);
    return mapBookingEntityToDomain(saved);
  }

  async findById(tenantId: string, bookingId: string): Promise<Booking | null> {
    const entity = await this.repository.findOne({
      where: { tenantId, id: bookingId },
    });

    return entity ? mapBookingEntityToDomain(entity) : null;
  }

  async findByHold(tenantId: string, holdId: string): Promise<Booking | null> {
    const entity = await this.repository.findOne({
      where: { tenantId, holdId },
    });

    return entity ? mapBookingEntityToDomain(entity) : null;
  }

  async listByProfessionalAndRange(
    tenantId: string,
    professionalId: string,
    rangeStartUtc: Date,
    rangeEndUtc: Date,
  ): Promise<Booking[]> {
    const entities = await this.repository.find({
      where: {
        tenantId,
        professionalId,
        startAtUtc: Between(rangeStartUtc, rangeEndUtc),
      },
      order: { startAtUtc: "ASC" },
    });

    return entities.map(mapBookingEntityToDomain);
  }

  async listByClinicAndRange(
    tenantId: string,
    clinicId: string,
    rangeStartUtc: Date,
    rangeEndUtc: Date,
  ): Promise<Booking[]> {
    const entities = await this.repository.find({
      where: {
        tenantId,
        clinicId,
        startAtUtc: Between(rangeStartUtc, rangeEndUtc),
      },
      order: { startAtUtc: "ASC" },
    });

    return entities.map(mapBookingEntityToDomain);
  }

  async updateStatus(data: UpdateBookingStatusInput): Promise<Booking> {
    const { bookingId, tenantId, expectedVersion, status, paymentStatus, cancellationReason } = data;

    const updates: QueryDeepPartialEntity<BookingEntity> = {
      status,
    };

    if (paymentStatus !== undefined) {
      updates.paymentStatus = paymentStatus;
    }

    if (cancellationReason !== undefined) {
      updates.cancellationReason = cancellationReason ?? null;
    }

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set(updates)
      .where("id = :bookingId", { bookingId })
      .andWhere("tenant_id = :tenantId", { tenantId })
      .andWhere("version = :version", { version: expectedVersion })
      .returning("*")
      .execute();

    if (!result.affected) {
      this.logger.warn(`UpdateStatus concurrency conflict for booking ${bookingId}`);
      throw new ConflictException('Nao foi possivel atualizar o status do agendamento');
    }

    return mapBookingEntityToDomain(result.raw[0] as BookingEntity);
  }

  async reschedule(data: RescheduleBookingInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, newStartAtUtc, newEndAtUtc } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        startAtUtc: newStartAtUtc,
        endAtUtc: newEndAtUtc,
      })
      .where("id = :bookingId", { bookingId })
      .andWhere("tenant_id = :tenantId", { tenantId })
      .andWhere("version = :version", { version: expectedVersion })
      .returning("*")
      .execute();

    if (!result.affected) {
      this.logger.warn(`Reschedule conflict for booking ${bookingId}`);
      throw new ConflictException('Nao foi possivel reagendar o compromisso');
    }

    return mapBookingEntityToDomain(result.raw[0] as BookingEntity);
  }

  async recordPaymentStatus(data: RecordPaymentStatusInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, paymentStatus } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({ paymentStatus })
      .where("id = :bookingId", { bookingId })
      .andWhere("tenant_id = :tenantId", { tenantId })
      .andWhere("version = :version", { version: expectedVersion })
      .returning("*")
      .execute();

    if (!result.affected) {
      throw new ConflictException('Nao foi possivel atualizar status de pagamento');
    }

    return mapBookingEntityToDomain(result.raw[0] as BookingEntity);
  }

  async markNoShow(data: MarkNoShowInput): Promise<Booking> {
    const { tenantId, bookingId, expectedVersion, markedAtUtc } = data;

    const result = await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({
        status: 'no_show',
        noShowMarkedAtUtc: markedAtUtc,
      })
      .where("id = :bookingId", { bookingId })
      .andWhere("tenant_id = :tenantId", { tenantId })
      .andWhere("version = :version", { version: expectedVersion })
      .returning("*")
      .execute();

    if (!result.affected) {
      throw new ConflictException('Nao foi possivel marcar no-show do agendamento');
    }

    return mapBookingEntityToDomain(result.raw[0] as BookingEntity);
  }
}
