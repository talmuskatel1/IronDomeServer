import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MapModule } from './modules/map/map.module';
import { PikudHaorefModule } from './modules/pikud-haoref/pikud-haoref.module';
import { UsersService } from './modules/users/user.service';
import { AuthModule } from './modules/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/user.module';
import { User } from './modules/users/entities/user.entity';

@Module({
  imports: [MapModule, PikudHaorefModule,  TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'irondome',
    entities: [User],
    synchronize: true,autoLoadEntities: true,
    extra: {
      trustServerCertificate: true
    }
  }),
  UsersModule,
  AuthModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}