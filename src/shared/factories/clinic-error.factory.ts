import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';

export class ClinicErrorFactory {
  static clinicNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static configurationVersionNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static serviceTypeNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static duplicateServiceType(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static invalidHoldWindow(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static holdAlreadyExists(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static holdNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static holdConfirmationNotAllowed(message: string): ForbiddenException {
    return new ForbiddenException(this.sanitize(message));
  }

  static overbookingReviewNotAllowed(message: string): ForbiddenException {
    return new ForbiddenException(this.sanitize(message));
  }

  static invitationNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static invitationAlreadyProcessed(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static invitationExpired(message: string): GoneException {
    return new GoneException(this.sanitize(message));
  }

  static invitationInvalidToken(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static invitationAlreadyExists(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static memberAlreadyExists(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static professionalPolicyNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static quotaExceeded(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static memberNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static clinicSlugInUse(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static clinicDocumentInUse(message: string): ConflictException {
    return new ConflictException(this.sanitize(message));
  }

  static invalidClinicData(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static paymentConfigurationNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static paymentCredentialsNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static paymentCredentialsInvalid(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static pendingFinancialObligations(message: string): ForbiddenException {
    return new ForbiddenException(this.sanitize(message));
  }

  static invalidConfiguration(section: string, reason: string): BadRequestException {
    const safeSection = this.sanitize(section);
    const safeReason = this.sanitize(reason);
    return new BadRequestException(
      `Configuracao invalida para a secao "${safeSection}": ${safeReason}`,
    );
  }

  static paymentVerificationFailed(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static paymentPayoutFailed(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static paymentProviderNotSupported(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static paymentWebhookInvalid(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  static paymentRecordNotFound(message: string): NotFoundException {
    return new NotFoundException(this.sanitize(message));
  }

  static externalEventInvalid(message: string): BadRequestException {
    return new BadRequestException(this.sanitize(message));
  }

  private static sanitize(message: string): string {
    if (!message) {
      return '';
    }

    return message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '');
  }
}
