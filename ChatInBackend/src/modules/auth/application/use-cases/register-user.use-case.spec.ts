import { UserEntity } from '../../../users/domain/entities/user.entity';
import { UsersRepository } from '../../../users/domain/repositories/users.repository';
import { PasswordHasher } from '../ports/password-hasher.port';
import { SessionIssuer } from '../services/session-issuer.service';
import { RegisterUserUseCase } from './register-user.use-case';

describe('RegisterUserUseCase', () => {
  const users = {
    existsByEmail: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  } as jest.Mocked<UsersRepository>;
  const hasher = { hash: jest.fn(), compare: jest.fn() } as jest.Mocked<PasswordHasher>;
  const sessions = { issue: jest.fn() } as unknown as jest.Mocked<SessionIssuer>;
  const useCase = new RegisterUserUseCase(users, hasher, sessions);

  beforeEach(() => jest.clearAllMocks());

  it('creates a user through the repository and issues a session', async () => {
    users.existsByEmail.mockResolvedValue(false);
    hasher.hash.mockResolvedValue('password-hash');
    users.save.mockImplementation(
      async (user) =>
        new UserEntity({
          id: 'user-1',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          passwordHash: user.passwordHash,
        }),
    );
    sessions.issue.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: {
        id: 'user-1',
        name: 'Ada Lovelace',
        nickname: 'ada',
        email: 'ada@example.com',
        coverPosition: 'center center',
        badges: [],
      },
    });

    const result = await useCase.execute({
      name: 'Ada Lovelace',
      nickname: 'ada',
      email: 'ADA@example.com',
      password: 'Password123',
    });

    expect(users.save).toHaveBeenCalled();
    expect(result.user.email).toBe('ada@example.com');
  });

  it('rejects an e-mail already in use', async () => {
    users.existsByEmail.mockResolvedValue(true);
    await expect(
      useCase.execute({
        name: 'Ada Lovelace',
        nickname: 'ada',
        email: 'ada@example.com',
        password: 'Password123',
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'EMAIL_ALREADY_IN_USE' }));
    expect(users.save).not.toHaveBeenCalled();
  });
});
