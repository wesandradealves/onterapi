import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  Clinic,
  ClinicBrandingSettings,
  ClinicBrandingSettingsConfig,
  ClinicGeneralSettings,
  ClinicIntegrationSettingsConfig,
  ClinicNotificationSettingsConfig,
  ClinicPaymentSettings,
  ClinicScheduleSettings,
  ClinicServiceSettings,
  ClinicStaffRole,
  ClinicTeamSettings,
} from '../../../domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import {
  IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  IClinicPaymentCredentialsService,
  IClinicPaymentCredentialsService as IClinicPaymentCredentialsServiceToken,
} from '../../../domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import {
  isValidCep,
  isValidCnpj,
  isValidCpf,
  isValidHexColor,
  isValidPhone,
  onlyDigits,
  toMinutes,
} from '../utils/clinic-validation.util';

type PlanQuotaConfig = Partial<Record<ClinicStaffRole, number>>;

const CONFIG_SECTIONS = {
  GENERAL: 'general',
  TEAM: 'team',
  SCHEDULE: 'schedule',
  SERVICES: 'services',
  PAYMENTS: 'payments',
  INTEGRATIONS: 'integrations',
  NOTIFICATIONS: 'notifications',
  BRANDING: 'branding',
} as const;

@Injectable()
export class ClinicConfigurationValidator {
  private readonly logger = new Logger(ClinicConfigurationValidator.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly clinicMemberRepository: IClinicMemberRepository,
    @Inject(IClinicPaymentCredentialsServiceToken)
    private readonly clinicPaymentCredentialsService: IClinicPaymentCredentialsService,
  ) {}

  async validateGeneralSettings(clinic: Clinic, settings: ClinicGeneralSettings): Promise<void> {
    if (!settings.tradeName || settings.tradeName.trim().length === 0) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.GENERAL,
        'nome fantasia e obrigatorio',
      );
    }

    if (!settings.address) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.GENERAL,
        'endereco e obrigatorio',
      );
    }

    if (!isValidCep(settings.address.zipCode ?? '')) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.GENERAL,
        'CEP invalido. Utilize 8 digitos numericos',
      );
    }

    if (settings.address.state && settings.address.state.length !== 2) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.GENERAL,
        'UF deve possuir exatamente duas letras',
      );
    }

    if (settings.contact?.phone && !isValidPhone(settings.contact.phone)) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.GENERAL,
        'telefone invalido. Utilize DDD + numero com 10 a 14 digitos',
      );
    }

    if (settings.contact?.whatsapp && !isValidPhone(settings.contact.whatsapp)) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.GENERAL,
        'whatsapp invalido. Utilize DDD + numero com 10 a 14 digitos',
      );
    }

    if (settings.foundationDate) {
      const now = new Date();
      const foundation = new Date(settings.foundationDate);
      if (Number.isNaN(foundation.getTime())) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.GENERAL,
          'data de fundacao invalida',
        );
      }

      if (foundation > now) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.GENERAL,
          'data de fundacao nao pode ser futura',
        );
      }
    }

    if (settings.document?.value) {
      const rawValue = settings.document.value.trim();
      const digits = onlyDigits(rawValue);

      if (settings.document.type === 'cnpj' || settings.document.type === 'mei') {
        if (!isValidCnpj(digits)) {
          throw ClinicErrorFactory.invalidConfiguration(CONFIG_SECTIONS.GENERAL, 'CNPJ invalido');
        }
      } else if (settings.document.type === 'cpf') {
        if (!isValidCpf(digits)) {
          throw ClinicErrorFactory.invalidConfiguration(CONFIG_SECTIONS.GENERAL, 'CPF invalido');
        }
      }

      const hasChanged = !clinic.document || clinic.document.value.replace(/\D+/g, '') !== digits;

      if (hasChanged) {
        const alreadyExists = await this.clinicRepository.existsByDocument(
          clinic.tenantId,
          digits,
          clinic.id,
        );

        if (alreadyExists) {
          throw ClinicErrorFactory.clinicDocumentInUse(
            'Documento ja cadastrado para outra clinica no mesmo tenant',
          );
        }
      }
    }
  }

  async validateTeamSettings(clinic: Clinic, settings: ClinicTeamSettings): Promise<void> {
    const quotas = settings.quotas ?? [];
    const seenRoles = new Set<ClinicStaffRole>();

    if (quotas.length === 0) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.TEAM,
        'ao menos uma cota por papel deve ser definida',
      );
    }

    const planQuotas = this.extractPlanQuotas(clinic);
    const activeMembers = await this.clinicMemberRepository.countByRole(clinic.id);

    for (const quota of quotas) {
      if (seenRoles.has(quota.role)) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.TEAM,
          `papel ${quota.role} possui cotas duplicadas`,
        );
      }

      seenRoles.add(quota.role);

      if (quota.limit <= 0) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.TEAM,
          `limite do papel ${quota.role} deve ser maior que zero`,
        );
      }

      const planLimit = planQuotas?.[quota.role];
      if (planLimit !== undefined && quota.limit > planLimit) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.TEAM,
          `limite do papel ${quota.role} excede a cota do plano (${planLimit})`,
        );
      }

      const currentActive = activeMembers[quota.role] ?? 0;
      if (currentActive > quota.limit) {
        throw ClinicErrorFactory.quotaExceeded(
          `Papel ${quota.role} possui ${currentActive} membros ativos, acima do limite informado (${quota.limit})`,
        );
      }
    }

    if (!seenRoles.has(RolesEnum.CLINIC_OWNER)) {
      this.logger.warn(
        `Configuracao de equipe sem cota explicita para Owner na clinica ${clinic.id}`,
      );
    }
  }

  validateScheduleSettings(settings: ClinicScheduleSettings): void {
    if (!settings.timezone || settings.timezone.trim().length === 0) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.SCHEDULE,
        'timezone e obrigatorio',
      );
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone });
    } catch (error) {
      throw ClinicErrorFactory.invalidConfiguration(CONFIG_SECTIONS.SCHEDULE, 'timezone invalido');
    }

    if (settings.autosaveIntervalSeconds <= 0) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.SCHEDULE,
        'intervalo de autosave deve ser maior que zero',
      );
    }

    settings.workingDays.forEach((day) => {
      const intervals = day.intervals.map((interval) => {
        const start = toMinutes(interval.start);
        const end = toMinutes(interval.end);

        if (Number.isNaN(start) || Number.isNaN(end)) {
          throw ClinicErrorFactory.invalidConfiguration(
            CONFIG_SECTIONS.SCHEDULE,
            `intervalo invalido no dia ${day.dayOfWeek}`,
          );
        }

        if (end <= start) {
          throw ClinicErrorFactory.invalidConfiguration(
            CONFIG_SECTIONS.SCHEDULE,
            `intervalo com horario final menor ou igual ao inicial no dia ${day.dayOfWeek}`,
          );
        }

        return { start, end };
      });

      const overlaps = this.findOverlap(intervals);
      if (overlaps) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.SCHEDULE,
          `intervalos sobrepostos detectados no dia ${day.dayOfWeek}`,
        );
      }
    });

    settings.exceptionPeriods?.forEach((exception) => {
      if (exception.end <= exception.start) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.SCHEDULE,
          `excecao ${exception.name} possui periodo invalido`,
        );
      }
    });
  }

  validateServiceSettings(settings: ClinicServiceSettings): void {
    const seenServiceTypes = new Set<string>();
    const seenSlugs = new Set<string>();

    for (const service of settings.services) {
      if (seenServiceTypes.has(service.serviceTypeId)) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.SERVICES,
          `servico ${service.serviceTypeId} duplicado`,
        );
      }

      seenServiceTypes.add(service.serviceTypeId);

      if (service.slug) {
        if (seenSlugs.has(service.slug)) {
          throw ClinicErrorFactory.invalidConfiguration(
            CONFIG_SECTIONS.SERVICES,
            `slug ${service.slug} duplicado`,
          );
        }
        seenSlugs.add(service.slug);
      }

      if (service.durationMinutes <= 0) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.SERVICES,
          `servico ${service.name} possui duracao invalida`,
        );
      }

      if (service.price < 0) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.SERVICES,
          `servico ${service.name} possui preco negativo`,
        );
      }

      if (
        service.maxAdvanceMinutes !== undefined &&
        service.maxAdvanceMinutes !== null &&
        service.maxAdvanceMinutes > 0 &&
        service.minAdvanceMinutes > service.maxAdvanceMinutes
      ) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.SERVICES,
          `servico ${service.name} possui antecedencia minima maior que a maxima`,
        );
      }

      if (service.color && !isValidHexColor(service.color)) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.SERVICES,
          `cor invalida para o servico ${service.name}`,
        );
      }
    }
  }

  async validatePaymentSettings(clinic: Clinic, settings: ClinicPaymentSettings): Promise<void> {
    if (settings.provider !== 'asaas') {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.PAYMENTS,
        'apenas ASAAS e suportado neste momento',
      );
    }

    await this.clinicPaymentCredentialsService.resolveCredentials({
      credentialsId: settings.credentialsId,
      clinicId: clinic.id,
      tenantId: clinic.tenantId,
    });

    const percentageTotal = settings.splitRules.reduce((acc, rule) => acc + rule.percentage, 0);

    if (Math.abs(percentageTotal - 100) > 0.001) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.PAYMENTS,
        'percentual de split deve totalizar 100%',
      );
    }

    const seenOrders = new Set<number>();
    settings.splitRules.forEach((rule) => {
      if (seenOrders.has(rule.order)) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.PAYMENTS,
          'ordem do split nao pode conter duplicidades',
        );
      }
      seenOrders.add(rule.order);
    });

    const { antifraud, refundPolicy, inadimplencyRule } = settings;

    if (antifraud?.enabled && antifraud.thresholdAmount !== undefined) {
      if (antifraud.thresholdAmount <= 0) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.PAYMENTS,
          'limite de antifraude deve ser positivo',
        );
      }
    }

    if (refundPolicy.feePercentage !== undefined) {
      if (refundPolicy.feePercentage < 0 || refundPolicy.feePercentage > 100) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.PAYMENTS,
          'taxa de reembolso deve estar entre 0 e 100%',
        );
      }
    }

    if (refundPolicy.processingTimeHours < 0) {
      throw ClinicErrorFactory.invalidConfiguration(
        CONFIG_SECTIONS.PAYMENTS,
        'tempo de processamento de reembolso nao pode ser negativo',
      );
    }

    if (inadimplencyRule) {
      if (inadimplencyRule.gracePeriodDays < 0) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.PAYMENTS,
          'periodo de carencia de inadimplencia nao pode ser negativo',
        );
      }

      if (
        inadimplencyRule.penaltyPercentage !== undefined &&
        (inadimplencyRule.penaltyPercentage < 0 || inadimplencyRule.penaltyPercentage > 100)
      ) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.PAYMENTS,
          'multa de inadimplencia deve estar entre 0 e 100%',
        );
      }

      if (
        inadimplencyRule.dailyInterestPercentage !== undefined &&
        (inadimplencyRule.dailyInterestPercentage < 0 ||
          inadimplencyRule.dailyInterestPercentage > 100)
      ) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.PAYMENTS,
          'juros diario deve estar entre 0 e 100%',
        );
      }
    }
  }

  validateIntegrationSettings(settings: ClinicIntegrationSettingsConfig): void {
    if (settings.whatsapp?.enabled) {
      if (!settings.whatsapp.provider) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.INTEGRATIONS,
          'provider do WhatsApp e obrigatorio quando a integracao esta habilitada',
        );
      }

      if (!settings.whatsapp.businessNumber || !isValidPhone(settings.whatsapp.businessNumber)) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.INTEGRATIONS,
          'numero do WhatsApp invalido. Utilize DDI+DDD+numero',
        );
      }

      if (settings.whatsapp.quietHours) {
        this.ensureValidQuietHours(
          CONFIG_SECTIONS.INTEGRATIONS,
          settings.whatsapp.quietHours.start,
          settings.whatsapp.quietHours.end,
        );
      }
    }

    if (settings.googleCalendar?.enabled) {
      if (settings.googleCalendar.syncMode === 'two_way') {
        if (!settings.googleCalendar.defaultCalendarId) {
          throw ClinicErrorFactory.invalidConfiguration(
            CONFIG_SECTIONS.INTEGRATIONS,
            'calendario padrao e obrigatorio para sincronizacao em duas vias',
          );
        }
      }
    }

    if (settings.email?.enabled) {
      if (!settings.email.provider) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.INTEGRATIONS,
          'provider de e-mail e obrigatorio quando a integracao esta ativa',
        );
      }

      if (!settings.email.fromEmail) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.INTEGRATIONS,
          'fromEmail e obrigatorio quando a integracao de e-mail esta ativa',
        );
      }
    }
  }

  validateNotificationSettings(settings: ClinicNotificationSettingsConfig): void {
    if (settings.quietHours) {
      this.ensureValidQuietHours(
        CONFIG_SECTIONS.NOTIFICATIONS,
        settings.quietHours.start,
        settings.quietHours.end,
      );
    }

    const templateIds = new Set<string>();
    settings.templates?.forEach((template) => {
      if (templateIds.has(template.id)) {
        throw ClinicErrorFactory.invalidConfiguration(
          CONFIG_SECTIONS.NOTIFICATIONS,
          `template ${template.id} duplicado`,
        );
      }
      templateIds.add(template.id);
    });
  }

  validateBrandingSettings(settings: ClinicBrandingSettings | ClinicBrandingSettingsConfig): void {
    const paletteColors: Array<{ name: string; value?: string }> = [
      { name: 'logoUrl', value: (settings as ClinicBrandingSettings).logoUrl },
      { name: 'lightLogoUrl', value: (settings as ClinicBrandingSettings).lightLogoUrl },
      { name: 'darkLogoUrl', value: (settings as ClinicBrandingSettings).darkLogoUrl },
    ];

    paletteColors.forEach((item) => {
      if (item.value && !item.value.startsWith('http')) {
        this.logger.warn(`Logo ${item.name} nao parece conter URL completa`);
      }
    });

    const palette =
      (settings as ClinicBrandingSettingsConfig).palette ??
      ({
        primaryColor: (settings as ClinicBrandingSettings).primaryColor,
        secondaryColor: (settings as ClinicBrandingSettings).secondaryColor,
        tertiaryColor: (settings as ClinicBrandingSettings).tertiaryColor,
      } as ClinicBrandingSettingsConfig['palette']);

    if (palette) {
      Object.entries(palette).forEach(([key, value]) => {
        if (value && !isValidHexColor(value)) {
          throw ClinicErrorFactory.invalidConfiguration(
            CONFIG_SECTIONS.BRANDING,
            `cor ${key} invalida`,
          );
        }
      });
    }
  }

  private ensureValidQuietHours(section: string, start: string, end: string): void {
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
      throw ClinicErrorFactory.invalidConfiguration(
        section,
        'quiet hours invalido: formato esperado HH:mm',
      );
    }

    if (endMinutes <= startMinutes) {
      throw ClinicErrorFactory.invalidConfiguration(
        section,
        'quiet hours: horario final deve ser maior que o inicial',
      );
    }
  }

  private findOverlap(intervals: Array<{ start: number; end: number }>): boolean {
    const ordered = [...intervals].sort((a, b) => a.start - b.start);

    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].start < ordered[index - 1].end) {
        return true;
      }
    }

    return false;
  }

  private extractPlanQuotas(clinic: Clinic): PlanQuotaConfig | undefined {
    const metadataPlan = clinic.metadata?.plan;

    if (!metadataPlan || typeof metadataPlan !== 'object') {
      return undefined;
    }

    const quotas = (metadataPlan as Record<string, unknown>).quotas;

    if (!quotas || typeof quotas !== 'object') {
      return undefined;
    }

    return Object.entries(quotas).reduce<PlanQuotaConfig>((acc, [role, limit]) => {
      if (typeof limit === 'number') {
        acc[role as ClinicStaffRole] = limit;
      }
      return acc;
    }, {});
  }
}
