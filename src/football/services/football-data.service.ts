import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Competition } from '../entities/competition.entity';
import { Team } from '../entities/team.entity';
import { Player } from '../entities/player.entity';
import { Coach } from '../entities/coach.entity';
import { ImportStatusService } from './import-status.service';
import {
  ApiCompetition,
  ApiTeam,
  ApiSquadMember,
  ApiCompetitionTeamsResponse,
  ApiTeamResponse,
} from '../types/api.types';

@Injectable()
export class FootballDataService {
  private readonly logger = new Logger(FootballDataService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly requestDelay: number;
  private readonly teamImportLimit: number;
  
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @InjectRepository(Competition)
    private competitionRepository: Repository<Competition>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Coach)
    private coachRepository: Repository<Coach>,
    private readonly importStatusService: ImportStatusService,
  ) {
    // Load configuration from environment variables
    this.apiUrl = this.configService.get<string>('FOOTBALL_API_URL', 'https://api.football-data.org/v4');
    this.apiToken = this.configService.get<string>('FOOTBALL_API_TOKEN', '0f1bb41149314c38adb92373442909f0');
    this.requestDelay = this.configService.get<number>('FOOTBALL_API_REQUEST_DELAY', 10000);
    this.teamImportLimit = this.configService.get<number>('FOOTBALL_TEAM_IMPORT_LIMIT', 5);
  }

  /**
   * Make an API request to the football data service
   */
  private async request<T>(endpoint: string): Promise<T> {
    try {
      this.logger.log(`Requesting data from ${endpoint}`);
      const response: AxiosResponse<T> = await axios.get(`${this.apiUrl}${endpoint}`, {
        headers: {
          'X-Auth-Token': this.apiToken,
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Error requesting ${endpoint}: ${axiosError.message}`);
      if (axiosError.response) {
        const responseData = axiosError.response.data as Record<string, any>;
        throw new HttpException(
          responseData.message || 'Football Data API error',
          axiosError.response.status,
        );
      }
      throw new HttpException('Football Data API error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delay execution to respect API rate limits
   */
  private delay(ms: number): Promise<void> {
    this.logger.debug(`Delaying request for ${ms}ms to respect API rate limits`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make API request with retry capability for rate limiting
   */
  private async requestWithRetry<T>(endpoint: string, retryCount = 0, maxRetries = 3): Promise<T> {
    try {
      return await this.request<T>(endpoint);
    } catch (error) {
      // If we hit a rate limit (429)
      if (error?.response?.status === 429 && retryCount < maxRetries) {
        // Extract wait time from error message or use exponential backoff
        const waitTimeMatch = error.message.match(/Wait (\d+) seconds/);
        const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1]) * 1000 : 1000 * Math.pow(2, retryCount);
        
        this.logger.log(`Rate limit hit. Waiting ${waitTime/1000} seconds before retry...`);
        await this.delay(waitTime);
        
        return this.requestWithRetry<T>(endpoint, retryCount + 1, maxRetries);
      }
      throw error;
    }
  }

  /**
   * Find or create a competition entity
   */
  private async findOrCreateCompetition(competitionData: ApiCompetition): Promise<Competition> {
    // Check if competition already exists
    let competition = await this.competitionRepository.findOne({
      where: { code: competitionData.code },
      relations: ['teams'],
    });
    
    if (!competition) {
      this.logger.log(`Creating new competition: ${competitionData.name}`);
      competition = this.competitionRepository.create({
        name: competitionData.name,
        code: competitionData.code,
        areaName: competitionData.area.name,
        teams: [],
      });
      await this.competitionRepository.save(competition);
    } else {
      this.logger.log(`Competition ${competitionData.name} already exists, updating`);
    }
    
    return competition;
  }

  /**
   * Find or create a team entity and associate it with a competition
   */
  private async findOrCreateTeam(teamData: ApiTeam, competition: Competition): Promise<Team> {
    // Check if team already exists
    let team = await this.teamRepository.findOne({
      where: { name: teamData.name },
      relations: ['players', 'coaches', 'competitions'],
    });
    
    if (!team) {
      this.logger.log(`Creating new team: ${teamData.name}`);
      team = this.teamRepository.create({
        name: teamData.name,
        tla: teamData.tla,
        shortName: teamData.shortName,
        areaName: teamData.area?.name,
        address: teamData.address,
        players: [],
        coaches: [],
        competitions: [competition],
      });
      await this.teamRepository.save(team);
    } else if (!team.competitions.some(comp => comp.id === competition.id)) {
      this.logger.log(`Adding team ${teamData.name} to competition ${competition.name}`);
      team.competitions.push(competition);
      await this.teamRepository.save(team);
    }

    // Add to competition's teams if not already there
    if (!competition.teams.some(t => t.id === team.id)) {
      competition.teams.push(team);
    }
    
    return team;
  }

  /**
   * Create or update a coach for a team
   */
  private async createOrUpdateCoach(coachData: { name: string, dateOfBirth?: string, nationality?: string }, team: Team): Promise<Coach> {
    const existingCoach = await this.coachRepository.findOne({
      where: { name: coachData.name, team: { id: team.id } },
    });
    
    if (!existingCoach) {
      this.logger.log(`Adding coach ${coachData.name} to team ${team.name}`);
      const coach = this.coachRepository.create({
        name: coachData.name,
        dateOfBirth: coachData.dateOfBirth || null,
        nationality: coachData.nationality || 'Unknown',
        team,
      });
      return await this.coachRepository.save(coach);
    }
    
    return existingCoach;
  }

  /**
   * Create a placeholder coach when no coach data is available
   */
  private async createPlaceholderCoach(team: Team): Promise<Coach> {
    const placeholderName = `Coach of ${team.name}`;
    
    const existingCoach = await this.coachRepository.findOne({
      where: { name: placeholderName, team: { id: team.id } },
    });
    
    if (!existingCoach) {
      this.logger.log(`Adding placeholder coach for team ${team.name}`);
      const coach = this.coachRepository.create({
        name: placeholderName,
        dateOfBirth: null,
        nationality: 'Unknown',
        team,
      });
      return await this.coachRepository.save(coach);
    }
    
    return existingCoach;
  }

  /**
   * Create or update a player for a team
   */
  private async createOrUpdatePlayer(playerData: ApiSquadMember, team: Team): Promise<Player> {
    const existingPlayer = await this.playerRepository.findOne({
      where: { name: playerData.name, team: { id: team.id } },
    });
    
    if (!existingPlayer) {
      this.logger.log(`Adding player ${playerData.name} to team ${team.name}`);
      const player = this.playerRepository.create({
        name: playerData.name,
        position: playerData.position || 'Unknown',
        dateOfBirth: playerData.dateOfBirth || null,
        nationality: playerData.nationality || 'Unknown',
        team,
      });
      return await this.playerRepository.save(player);
    }
    
    return existingPlayer;
  }

  /**
   * Process a team's squad data
   */
  private async processTeamSquad(squadData: ApiTeamResponse, team: Team): Promise<void> {
    // Process coach first
    if (squadData.coach) {
      this.logger.log(`Processing coach for team ${team.name}: ${squadData.coach.name}`);
      await this.createOrUpdateCoach(squadData.coach, team);
    } else {
      // Create a placeholder coach if none found
      await this.createPlaceholderCoach(team);
    }
    
    // Process squad members
    if (squadData.squad && squadData.squad.length > 0) {
      this.logger.log(`Processing ${squadData.squad.length} squad members for ${team.name}`);
      
      for (const playerData of squadData.squad) {
        const role = playerData.role?.toUpperCase() || '';
        
        if (!role || role === 'PLAYER' || role.includes('PLAYER')) {
          await this.createOrUpdatePlayer(playerData, team);
        } else if (role === 'COACH' || role.includes('COACH') || role.includes('MANAGER')) {
          await this.createOrUpdateCoach(playerData, team);
        } else {
          this.logger.warn(`Unknown role for squad member: ${role} - ${playerData.name}`);
        }
      }
    } else if (!squadData.coach) {
      // If no squad or coach data available, create a placeholder coach
      this.logger.log(`No coach data available for ${team.name}, creating placeholder`);
      await this.createPlaceholderCoach(team);
    }
  }

  /**
   * Import a football league and its associated teams, players and coaches
   */
  async importLeague(leagueCode: string): Promise<Competition> {
    this.logger.log(`Importing league with code: ${leagueCode}`);
    
    try {
      // Fetch competition
      const competitionData = await this.requestWithRetry<ApiCompetition>(`/competitions/${leagueCode}`);
      this.logger.log(`Retrieved competition data for ${competitionData.name}`);
      
      // Use a transaction for related database operations
      return await this.dataSource.transaction(async manager => {
        // Set repositories for the transaction
        const competitionRepo = manager.getRepository(Competition);
        const teamRepo = manager.getRepository(Team);
        
        // Find or create competition
        const competition = await this.findOrCreateCompetition(competitionData);
        
        // Fetch teams in competition
        const teamsData = await this.requestWithRetry<ApiCompetitionTeamsResponse>(`/competitions/${leagueCode}/teams`);
        this.logger.log(`Retrieved ${teamsData.teams.length} teams for competition ${competitionData.name}`);
        
        // Initialize status tracking
        const totalTeams = Math.min(teamsData.teams.length, this.teamImportLimit);
        this.importStatusService.setImportStarted(leagueCode, totalTeams);
        
        // Process each team
        for (let i = 0; i < totalTeams; i++) {
          const teamData = teamsData.teams[i];
          this.logger.log(`Processing team: ${teamData.name} (${i + 1}/${totalTeams})`);
          this.importStatusService.updateProgress(i);
          
          // Find or create team
          const team = await this.findOrCreateTeam(teamData, competition);
  
          // Fetch squad data with delay to respect API rate limits
          this.logger.log(`Waiting before fetching squad data for ${teamData.name}`);
          await this.delay(this.requestDelay);
          
          try {
            const squadData = await this.requestWithRetry<ApiTeamResponse>(`/teams/${teamData.id}`);
            this.logger.log(`Retrieved squad data for team ${teamData.name}`);
            
            // Process the team's squad (players and coaches)
            await this.processTeamSquad(squadData, team);
            
            // Reload team to log updated information
            const updatedTeam = await teamRepo.findOne({
              where: { id: team.id },
              relations: ['players', 'coaches'],
            });
            
            if (updatedTeam) {
              this.logger.log(`Team ${teamData.name} now has ${updatedTeam.players?.length || 0} players and ${updatedTeam.coaches?.length || 0} coaches`);
            }
          } catch (error) {
            this.logger.error(`Error processing squad for team ${teamData.name}: ${error.message}`);
            // Continue with next team even if one fails
          }
        }
  
        // Save updated competition
        this.logger.log(`Completed importing league ${competitionData.name} with ${totalTeams} teams`);
        await competitionRepo.save(competition);
        
        // Reload competition with all relations to return complete data
        const fullCompetition = await competitionRepo.findOne({
          where: { id: competition.id },
          relations: ['teams', 'teams.players', 'teams.coaches'],
        });
        
        this.importStatusService.setImportComplete();
        
        if (!fullCompetition) {
          throw new Error(`Could not find competition after import: ${leagueCode}`);
        }
        
        return fullCompetition;
      });
    } catch (error) {
      this.logger.error(`Error importing league ${leagueCode}: ${error.message}`);
      this.importStatusService.setImportError(error.message);
      throw error;
    }
  }
} 