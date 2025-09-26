import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class PatientErrorFactory {
  static duplicateCpf(cpf: string): BadRequestException {
    const trimmedCpf = cpf.trim();
    const message = trimmedCpf
      ? `Paciente com CPF ${trimmedCpf} ja cadastrado`
      : 'Paciente com CPF ja cadastrado';

    return new BadRequestException(message);
  }

  static notFound(): NotFoundException {
    return new NotFoundException('Paciente nao encontrado');
  }

  static unauthorized(message = 'Permissoes insuficientes'): ForbiddenException {
    return new ForbiddenException(message);
  }
}
