import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class AnamnesisErrorFactory {
  static notFound(message = 'Anamnese nao encontrada'): NotFoundException {
    return new NotFoundException(message);
  }

  static unauthorized(message = 'Operacao nao autorizada para esta anamnese'): ForbiddenException {
    return new ForbiddenException(message);
  }

  static invalidState(message = 'Estado da anamnese nao permite esta operacao'): ConflictException {
    return new ConflictException(message);
  }

  static invalidPayload(
    message = 'Dados da etapa sao invalidos',
    details?: unknown,
  ): BadRequestException {
    return new BadRequestException({
      message,
      details,
    });
  }
}
