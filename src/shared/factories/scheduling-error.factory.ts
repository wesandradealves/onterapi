import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';

export class SchedulingErrorFactory {
  static tooCloseToStart(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static tooFarInFuture(message: string): BadRequestException {
    return new BadRequestException(message);
  }

  static holdNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static clinicNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static serviceTypeNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static holdInvalidState(message: string): ConflictException {
    return new ConflictException(message);
  }

  static holdExpired(message: string): GoneException {
    return new GoneException(message);
  }

  static paymentNotApproved(message: string): ForbiddenException {
    return new ForbiddenException(message);
  }

  static holdNotAllowed(message: string): ForbiddenException {
    return new ForbiddenException(message);
  }

  static bookingInvalidState(message: string): ConflictException {
    return new ConflictException(message);
  }

  static bookingNotFound(message: string): NotFoundException {
    return new NotFoundException(message);
  }

  static recurrenceLimitReached(message: string): ConflictException {
    return new ConflictException(message);
  }

  static tooEarlyForNoShow(message: string): BadRequestException {
    return new BadRequestException(message);
  }
}
