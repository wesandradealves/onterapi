import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';

export class ClinicErrorFactory {
  static clinicNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static configurationVersionNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static serviceTypeNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static duplicateServiceType(message: string): ConflictException {
    return new ConflictException(message);
  }

  static invalidHoldWindow(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static holdAlreadyExists(message: string): ConflictException {
    return new ConflictException(message);
  }

  static holdNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static holdConfirmationNotAllowed(message: string): ForbiddenException {
    return new ForbiddenException(message);
  }

  static invitationNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static invitationAlreadyProcessed(message: string): ConflictException {
    return new ConflictException(message);
  }

  static invitationExpired(message: string): GoneException {
    return new GoneException(message);
  }

  static invitationInvalidToken(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static invitationAlreadyExists(message: string): ConflictException {
    return new ConflictException(message);
  }

  static memberAlreadyExists(message: string): ConflictException {
    return new ConflictException(message);
  }

  static quotaExceeded(message: string): ConflictException {
    return new ConflictException(message);
  }

  static memberNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static clinicSlugInUse(message: string): ConflictException {
    return new ConflictException(message);
  }

  static clinicDocumentInUse(message: string): ConflictException {
    return new ConflictException(message);
  }

  static invalidClinicData(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static paymentConfigurationNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static paymentCredentialsNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static paymentCredentialsInvalid(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static paymentVerificationFailed(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static paymentProviderNotSupported(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static paymentWebhookInvalid(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static paymentRecordNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }
}
