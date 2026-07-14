import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  public constructor(
    private readonly health: HealthCheckService,
    private readonly database: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  public check() {
    return this.health.check([() => this.database.pingCheck('mongodb', { timeout: 1_500 })]);
  }
}
