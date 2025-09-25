import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { UserEntity } from '../../auth/entities/user.entity';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

describe('UserRepository', () => {
  describe('update', () => {
    it('converte role para o formato do banco antes de atualizar', async () => {
      const repositoryMock = {
        update: jest.fn().mockResolvedValue(undefined),
      } as unknown as Repository<UserEntity>;

      const userRepository = new UserRepository(repositoryMock);
      const findByIdSpy = jest.spyOn(userRepository, 'findById').mockResolvedValue({} as UserEntity);

      await userRepository.update('user-id', { role: RolesEnum.SUPER_ADMIN });

      expect(repositoryMock.update).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ role: 'super_admin' }),
      );
      expect(findByIdSpy).toHaveBeenCalledWith('user-id');

      findByIdSpy.mockRestore();
    });
  });
});
