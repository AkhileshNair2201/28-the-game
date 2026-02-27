import { Controller, Get, Inject } from '@nestjs/common';
import { LobbiesService } from '../lobbies/lobbies.service';
import { ObservabilityService } from './observability.service';

@Controller('observability')
export class ObservabilityController {
  constructor(
    @Inject(ObservabilityService) private readonly observabilityService: ObservabilityService,
    @Inject(LobbiesService) private readonly lobbiesService: LobbiesService
  ) {}

  @Get('metrics')
  metrics() {
    return this.observabilityService.getSnapshot(this.lobbiesService.getActiveLobbyCount());
  }
}
