import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersRepository } from "./domain/repositories/users.repository";
import { MongooseUsersRepository } from "./infrastructure/persistence/mongoose/repositories/mongoose-users.repository";
import {
  UserPersistence,
  UserSchema,
} from "./infrastructure/persistence/mongoose/schemas/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPersistence.name, schema: UserSchema },
    ]),
  ],
  providers: [{ provide: UsersRepository, useClass: MongooseUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
