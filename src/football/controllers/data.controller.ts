import { Controller, Get, Param } from '@nestjs/common';
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

  @Get('team-coaches/:teamId')
  async getTeamCoaches(@Param('teamId') teamId: number) {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['coaches'],
    });
    
    return {
      teamName: team?.name,
      coaches: team?.coaches || [],
      coachCount: team?.coaches?.length || 0
    };
  }

  @Get('competition-coaches/:competitionCode')
  async getCompetitionCoaches(@Param('competitionCode') competitionCode: string) {
    const competition = await this.competitionRepository.findOne({
      where: { code: competitionCode },
      relations: ['teams', 'teams.coaches'],
    });
    
    const coachData: { teamName: string; coaches: Coach[]; coachCount: number }[] = [];
    
    for (const team of competition?.teams || []) {
      coachData.push({
        teamName: team.name,
        coaches: team.coaches || [],
        coachCount: team.coaches?.length || 0
      });
    }
    
    return {
      competitionName: competition?.name,
      teams: coachData,
      totalCoaches: coachData.reduce((sum, team) => sum + team.coachCount, 0)
    };
  }
} 