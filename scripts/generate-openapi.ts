import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import Swagger from '../src/core/shared/swagger/swagger.config';

function sanitizeToAscii(content: string): string {
  return content
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014\u2212\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x00-\x7F]/g, '');
}

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  try {
    const document = Swagger.createDocument(app);
    const json = JSON.stringify(document, null, 2);
    const asciiJson = sanitizeToAscii(json);
    const outputPath = join(__dirname, '..', 'openapi.json');

    writeFileSync(outputPath, asciiJson, { encoding: 'utf8' });
    // eslint-disable-next-line no-console
    console.log(`OpenAPI specification gerada com sucesso em ${outputPath}`);
  } finally {
    await app.close();
  }
}

generate().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Falha ao gerar OpenAPI specification', error);
  process.exitCode = 1;
});
