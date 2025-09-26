import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class PatientErrorFactory {
  static duplicateCpf(cpf: string): BadRequestException {
    return new BadRequestException('Paciente com CPF ja cadastrado');
  }

  static notFound(): NotFoundException {
    return new NotFoundException('Paciente nao encontrado');
  }

  static unauthorized(message = 'Permissoes insuficientes'): ForbiddenException {
    return new ForbiddenException(message);
  }
}
