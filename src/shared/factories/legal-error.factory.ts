import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class LegalErrorFactory {
  static notFound(): NotFoundException {
    return new NotFoundException('Termo legal não encontrado.');
  }

  static versionAlreadyExists(): ConflictException {
    return new ConflictException('Já existe um termo com esta versão para o contexto informado.');
  }

  static alreadyPublished(): ConflictException {
    return new ConflictException('Termo legal já está publicado.');
  }

  static cannotRetireDraft(): BadRequestException {
    return new BadRequestException(
      'Não é possível desativar um termo que ainda não foi publicado.',
    );
  }
}
