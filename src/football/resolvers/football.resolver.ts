import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Competition } from '../entities/competition.entity';
import { Team } from '../entities/team.entity';
import { Player } from '../entities/player.entity';
import { Coach } from '../entities/coach.entity';
import { FootballDataService } from '../services/football-data.service';
import { NotFoundException } from '@nestjs/common';

@Resolver(() => Competition)
export class CompetitionResolver {
  constructor(
    private readonly footballDataService: FootballDataService,
    @InjectRepository(Competition)
    private competitionRepository: Repository<Competition>,
  ) {}

  @Mutation(() => Competition)
  async importLeague(@Args('leagueCode') leagueCode: string) {
    return this.footballDataService.importLeague(leagueCode);
  }
}

@Resolver(() => Team)
export class TeamResolver {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
  ) {}

  @Query(() => Team)
  async team(@Args('name') name: string) {
    const team = await this.teamRepository.findOne({ 
      where: { name },
      relations: ['players', 'coaches', 'competitions']
    });
    
    if (!team) {
      throw new NotFoundException(`Team with name ${name} not found`);
    }
    
    return team;
  }

  @ResolveField()
  async players(@Parent() team: Team) {
    const { id } = team;
    const foundTeam = await this.teamRepository.findOne({
      where: { id },
      relations: ['players'],
    });
    return foundTeam?.players || [];
  }

  @ResolveField()
  async coaches(@Parent() team: Team) {
    const { id } = team;
    const foundTeam = await this.teamRepository.findOne({
      where: { id },
      relations: ['coaches'],
    });
    return foundTeam?.coaches || [];
  }
}

@Resolver(() => Player)
export class PlayerResolver {
  constructor(
    @InjectRepository(Competition)
    private competitionRepository: Repository<Competition>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
  ) {}

  @Query(() => [Player])
  async players(
    @Args('leagueCode') leagueCode: string,
    @Args('teamName', { nullable: true }) teamName?: string,
  ) {
    const competition = await this.competitionRepository.findOne({
      where: { code: leagueCode },
      relations: ['teams', 'teams.players'],
    });
    
    if (!competition) {
      throw new NotFoundException(`League with code ${leagueCode} not found`);
    }
    
    let players: Player[] = [];
    for (const team of competition.teams) {
      if (!teamName || team.name === teamName) {
        const teamWithPlayers = await this.teamRepository.findOne({
          where: { id: team.id },
          relations: ['players'],
        });
        if (teamWithPlayers?.players) {
          players.push(...teamWithPlayers.players);
        }
      }
    }
    
    return players;
  }
}

@Resolver(() => Coach)
export class CoachResolver {
  constructor(
    @InjectRepository(Competition)
    private competitionRepository: Repository<Competition>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Coach)
    private coachRepository: Repository<Coach>,
  ) {}

  @Query(() => [Coach])
  async coaches(
    @Args('leagueCode') leagueCode: string,
    @Args('teamName', { nullable: true }) teamName?: string,
  ) {
    const competition = await this.competitionRepository.findOne({
      where: { code: leagueCode },
      relations: ['teams'],
    });
    
    if (!competition) {
      throw new NotFoundException(`League with code ${leagueCode} not found`);
    }
    
    let coaches: Coach[] = [];
    for (const team of competition.teams) {
      if (!teamName || team.name === teamName) {
        const teamWithCoaches = await this.teamRepository.findOne({
          where: { id: team.id },
          relations: ['coaches'],
        });
        if (teamWithCoaches?.coaches) {
          coaches = [...coaches, ...teamWithCoaches.coaches];
        }
      }
    }
    
    // If we still don't find any coaches, let's directly query them
    if (coaches.length === 0) {
      coaches = await this.coachRepository.find({
        relations: ['team'],
        where: teamName 
          ? { team: { name: teamName } }
          : { team: { competitions: { code: leagueCode } } }
      });
    }
    
    return coaches;
  }
} 