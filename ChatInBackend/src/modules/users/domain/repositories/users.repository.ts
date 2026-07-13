import { UserEntity } from "../entities/user.entity";

export abstract class UsersRepository {
  public abstract existsByEmail(email: string): Promise<boolean>;
  public abstract findByEmail(email: string): Promise<UserEntity | null>;
  public abstract findById(id: string): Promise<UserEntity | null>;
  public abstract findByPasswordResetToken(
    tokenHash: string,
    now: Date,
  ): Promise<UserEntity | null>;
  public abstract save(user: UserEntity): Promise<UserEntity>;
  public abstract deleteById(id: string): Promise<void>;
}
