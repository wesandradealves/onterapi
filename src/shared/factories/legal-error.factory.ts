import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class LegalErrorFactory {
  static notFound(): NotFoundException {
    return new NotFoundException('Termo legal nao encontrado.');
  }

  static versionAlreadyExists(): ConflictException {
    return new ConflictException('Ja existe um termo com esta versao para o contexto informado.');
  }

  static alreadyPublished(): ConflictException {
    return new ConflictException('Termo legal ja esta publicado.');
  }

  static cannotRetireDraft(): BadRequestException {
    return new BadRequestException(
      'Nao e possivel desativar um termo que ainda nao foi publicado.',
    );
  }
}
