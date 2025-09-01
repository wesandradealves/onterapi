import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

/**
 * Decorator para headers implícitos que não devem aparecer no Swagger
 * Usado para headers como user-agent e ip que são capturados automaticamente
 */
export function ApiImplicitHeaders() {
  return applyDecorators(
    // Este decorator não adiciona nada ao Swagger
    // Apenas documenta que estamos usando headers implícitos
  );
}