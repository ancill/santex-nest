import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { Team } from '../entities/team.entity';
import { Player } from '../entities/player.entity';
import { Coach } from '../entities/coach.entity';

@Controller('data')
export class DataController {
  constructor(
    @InjectRepository(Competition)
    private competitionRepository: Repository<Competition>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Coach)
    private coachRepository: Repository<Coach>,
  ) {}

  @Get('competitions')
  async getCompetitions() {
    return this.competitionRepository.find();
  }

  @Get('teams')
  async getTeams() {
    return this.teamRepository.find();
  }

  @Get('players')
  async getPlayers() {
    return this.playerRepository.find();
  }

  @Get('coaches')
  async getCoaches() {
    return this.coachRepository.find();
  }
} 