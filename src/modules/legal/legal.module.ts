import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ILegalTermsRepositoryToken } from '../../domain/legal/interfaces/legal-terms.repository.interface';
import { LegalTermsRepository } from '../../infrastructure/legal/legal-terms.repository';
import { LegalTermEntity } from '../../infrastructure/legal/entities/legal-term.entity';
import { LegalTermsService } from './legal-terms.service';
import { LegalTermsController } from './api/controllers/legal-terms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LegalTermEntity])],
  controllers: [LegalTermsController],
  providers: [
    LegalTermsService,
    {
      provide: ILegalTermsRepositoryToken,
      useClass: LegalTermsRepository,
    },
  ],
  exports: [LegalTermsService],
})
export class LegalModule {}
