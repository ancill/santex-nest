import { Controller, Get } from '@nestjs/common';
import { ImportStatusService, ImportStatus } from '../services/import-status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly importStatusService: ImportStatusService) {}

  @Get('import')
  getImportStatus(): ImportStatus {
    return this.importStatusService.getStatus();
  }
} 