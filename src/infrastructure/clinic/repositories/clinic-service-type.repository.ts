import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ClinicServiceTypeDefinition,
  RemoveClinicServiceTypeInput,
  UpsertClinicServiceTypeInput,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicServiceTypeRepository } from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import { ClinicServiceTypeEntity } from '../entities/clinic-service-type.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicServiceTypeRepository implements IClinicServiceTypeRepository {
  constructor(
    @InjectRepository(ClinicServiceTypeEntity)
    private readonly repository: Repository<ClinicServiceTypeEntity>,
  ) {}

  async upsert(input: UpsertClinicServiceTypeInput): Promise<ClinicServiceTypeDefinition> {
    const { clinicId, tenantId, service } = input;

    let entity: ClinicServiceTypeEntity | null = null;

    if (service.id) {
      entity = await this.repository.findOne({
        where: { id: service.id, clinicId, tenantId },
        withDeleted: false,
      });
    }

    if (!entity) {
      const existingSlug = await this.repository.findOne({
        where: {
          clinicId,
          tenantId,
          slug: service.slug,
        },
      });

      if (existingSlug && existingSlug.id !== service.id) {
        throw new Error('Service type slug already in use');
      }

      entity = this.repository.create({
        clinicId,
        tenantId,
        slug: service.slug,
      });
    }

    entity.name = service.name;
    entity.color = service.color ?? null;
    entity.durationMinutes = service.durationMinutes;
    entity.price = service.price;
    entity.currency = service.currency;
    entity.isActive = service.isActive;
    entity.requiresAnamnesis = service.requiresAnamnesis;
    entity.enableOnlineScheduling = service.enableOnlineScheduling;
    entity.minAdvanceMinutes = service.minAdvanceMinutes;
    entity.maxAdvanceMinutes = service.maxAdvanceMinutes ?? null;
    entity.cancellationPolicy = service.cancellationPolicy;
    entity.eligibility = service.eligibility;
    entity.instructions = service.instructions ?? null;
    entity.requiredDocuments = service.requiredDocuments ?? [];
    entity.customFields = service.customFields ?? [];

    const saved = await this.repository.save(entity);
    return ClinicMapper.toServiceType(saved);
  }

  async remove(input: RemoveClinicServiceTypeInput): Promise<void> {
    const entity = await this.repository.findOne({
      where: {
        id: input.serviceTypeId,
        clinicId: input.clinicId,
        tenantId: input.tenantId,
      },
    });

    if (!entity) {
      throw new Error('Service type not found');
    }

    entity.isActive = false;
    entity.archivedAt = new Date();

    await this.repository.save(entity);
  }

  async findById(
    clinicId: string,
    serviceTypeId: string,
  ): Promise<ClinicServiceTypeDefinition | null> {
    const entity = await this.repository.findOne({
      where: { id: serviceTypeId, clinicId },
    });

    return entity ? ClinicMapper.toServiceType(entity) : null;
  }

  async findBySlug(clinicId: string, slug: string): Promise<ClinicServiceTypeDefinition | null> {
    const entity = await this.repository.findOne({
      where: { clinicId, slug },
    });

    return entity ? ClinicMapper.toServiceType(entity) : null;
  }

  async list(params: {
    clinicId: string;
    tenantId: string;
    includeInactive?: boolean;
  }): Promise<ClinicServiceTypeDefinition[]> {
    const entities = await this.repository.find({
      where: {
        clinicId: params.clinicId,
        tenantId: params.tenantId,
        ...(params.includeInactive ? {} : { isActive: true }),
      },
      order: { name: 'ASC' },
    });

    return entities.map(ClinicMapper.toServiceType);
  }
}
