import { Controller, Get, Param, Query } from '@nestjs/common';
import { FootballService } from '../services/football.service';

@Controller('football')
export class FootballController {
  constructor(private readonly footballService: FootballService) {}

  @Get('data')
  async getFootballData(@Query() query) {
    return this.footballService.getFootballData(query);
  }

  @Get('status')
  async getStatus() {
    return this.footballService.getImportStatus();
  }

  // Additional endpoints consolidated from the original controllers
} 