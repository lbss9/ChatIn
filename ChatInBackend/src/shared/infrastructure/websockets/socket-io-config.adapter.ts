import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketIoConfigAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const origins = this.config
      .get<string>('WEBSOCKET_ORIGIN', this.config.get<string>('WEB_ORIGIN', 'http://localhost:3000'))
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: origins,
        credentials: true,
      },
    });
  }
}
