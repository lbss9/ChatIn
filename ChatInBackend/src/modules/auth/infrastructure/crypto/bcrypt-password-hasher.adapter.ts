import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  public hash(value: string) {
    return bcrypt.hash(value, 12);
  }
  public compare(value: string, hash: string) {
    return bcrypt.compare(value, hash);
  }
}
