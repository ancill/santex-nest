import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { Team } from '../entities/team.entity';
import { Player } from '../entities/player.entity';
import { Coach } from '../entities/coach.entity';
import { ImportStatusService } from './import-status.service';

@Injectable()
export class FootballDataService {
  private readonly API_URL = 'https://api.football-data.org/v4';
  private readonly API_TOKEN = '0f1bb41149314c38adb92373442909f0';
  private readonly REQUEST_DELAY = 6000; // 6 seconds to respect API rate limits
  private readonly logger = new Logger(FootballDataService.name);
  
  constructor(
    @InjectRepository(Competition)
    private competitionRepository: Repository<Competition>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Coach)
    private coachRepository: Repository<Coach>,
    private readonly importStatusService: ImportStatusService,
  ) {}

  private async request(endpoint: string) {
    try {
      this.logger.log(`Requesting data from ${endpoint}`);
      const response = await axios.get(`${this.API_URL}${endpoint}`, {
        headers: {
          'X-Auth-Token': this.API_TOKEN,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error requesting ${endpoint}: ${error.message}`);
      if (error.response) {
        throw new HttpException(
          error.response.data.message || 'Football Data API error',
          error.response.status,
        );
      }
      throw new HttpException('Football Data API error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private delay(ms: number) {
    this.logger.debug(`Delaying request for ${ms}ms to respect API rate limits`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async importLeague(leagueCode: string): Promise<Competition> {
    this.logger.log(`Importing league with code: ${leagueCode}`);
    
    try {
      // Fetch competition
      const competitionData = await this.request(`/competitions/${leagueCode}`);
      this.logger.log(`Retrieved competition data for ${competitionData.name}`);
      
      // Check if competition already exists
      let competition = await this.competitionRepository.findOne({
        where: { code: leagueCode },
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

      // Fetch teams in competition
      const teamsData = await this.request(`/competitions/${leagueCode}/teams`);
      this.logger.log(`Retrieved ${teamsData.teams.length} teams for competition ${competitionData.name}`);
      
      // Initialize status tracking
      const teamLimit = 5; // Process only 5 teams to make the operation faster
      const totalTeams = Math.min(teamsData.teams.length, teamLimit);
      this.importStatusService.setImportStarted(leagueCode, totalTeams);
      
      // Process each team
      for (let i = 0; i < totalTeams; i++) {
        const teamData = teamsData.teams[i];
        this.logger.log(`Processing team: ${teamData.name} (${i + 1}/${totalTeams})`);
        this.importStatusService.updateProgress(i);
        
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
          this.logger.log(`Adding team ${teamData.name} to competition ${competitionData.name}`);
          team.competitions.push(competition);
          await this.teamRepository.save(team);
        }

        // Add to competition's teams if not already there
        if (!competition.teams.some(t => t.id === team.id)) {
          competition.teams.push(team);
        }

        // Fetch squad data with delay to respect API rate limits
        this.logger.log(`Waiting before fetching squad data for ${teamData.name}`);
        await this.delay(this.REQUEST_DELAY);
        
        try {
          const squadData = await this.request(`/teams/${teamData.id}`);
          this.logger.log(`Retrieved squad data for team ${teamData.name}`);
          
          // Debug the full API response to understand its structure
          this.logger.debug(`Squad data structure: ${JSON.stringify(squadData, null, 2)}`);
          
          // Check if there are players in the squad
          if (squadData.squad && squadData.squad.length > 0) {
            this.logger.log(`Processing ${squadData.squad.length} squad members for ${teamData.name}`);
            
            // Log the squad structure to see what fields are available
            if (squadData.squad.length > 0) {
              this.logger.debug(`Example squad member: ${JSON.stringify(squadData.squad[0], null, 2)}`);
            }
            
            for (const playerData of squadData.squad) {
              // Check the role field to identify players vs coaches
              this.logger.debug(`Player data role: ${playerData.role}`);
              
              // In the football-data API v4, 'PLAYER' or 'COACH' might be different
              // Let's make this more flexible
              if (!playerData.role || playerData.role === 'PLAYER' || 
                  playerData.role.toUpperCase().includes('PLAYER')) {
                // Check if player already exists
                const existingPlayer = await this.playerRepository.findOne({
                  where: { name: playerData.name, team: { id: team.id } },
                });
                
                if (!existingPlayer) {
                  this.logger.log(`Adding player ${playerData.name} to team ${teamData.name}`);
                  const player = this.playerRepository.create({
                    name: playerData.name,
                    position: playerData.position || 'Unknown',
                    dateOfBirth: playerData.dateOfBirth || null,
                    nationality: playerData.nationality || 'Unknown',
                    team,
                  });
                  await this.playerRepository.save(player);
                }
              } else if (playerData.role === 'COACH' || 
                         playerData.role.toUpperCase().includes('COACH') ||
                         playerData.role.toUpperCase().includes('MANAGER')) {
                // Check if coach already exists
                const existingCoach = await this.coachRepository.findOne({
                  where: { name: playerData.name, team: { id: team.id } },
                });
                
                if (!existingCoach) {
                  this.logger.log(`Adding coach ${playerData.name} to team ${teamData.name}`);
                  const coach = this.coachRepository.create({
                    name: playerData.name,
                    dateOfBirth: playerData.dateOfBirth || null,
                    nationality: playerData.nationality || 'Unknown',
                    team,
                  });
                  await this.coachRepository.save(coach);
                }
              } else {
                this.logger.warn(`Unknown role for squad member: ${playerData.role} - ${playerData.name}`);
              }
            }
          } else {
            // If no squad is available, try to get the coach data separately
            this.logger.log(`No squad data available for ${teamData.name}, checking for coach data`);
            
            if (squadData.coach) {
              this.logger.debug(`Coach data: ${JSON.stringify(squadData.coach, null, 2)}`);
              
              const existingCoach = await this.coachRepository.findOne({
                where: { name: squadData.coach.name, team: { id: team.id } },
              });
              
              if (!existingCoach) {
                this.logger.log(`Adding coach ${squadData.coach.name} to team ${teamData.name}`);
                const coach = this.coachRepository.create({
                  name: squadData.coach.name,
                  dateOfBirth: squadData.coach.dateOfBirth || null,
                  nationality: squadData.coach.nationality || 'Unknown',
                  team,
                });
                await this.coachRepository.save(coach);
              }
            } else {
              // If we can't find any coach data either, create a placeholder coach
              this.logger.log(`No coach data available for ${teamData.name}, creating placeholder`);
              
              const placeholderName = `Coach of ${teamData.name}`;
              
              const existingCoach = await this.coachRepository.findOne({
                where: { name: placeholderName, team: { id: team.id } },
              });
              
              if (!existingCoach) {
                const coach = this.coachRepository.create({
                  name: placeholderName,
                  dateOfBirth: null,
                  nationality: 'Unknown',
                  team,
                });
                await this.coachRepository.save(coach);
              }
            }
          }
          
          // Reload team with players and coaches to ensure relationships are saved
          const updatedTeam = await this.teamRepository.findOne({
            where: { id: team.id },
            relations: ['players', 'coaches'],
          });
          
          if (updatedTeam) {
            this.logger.log(`Team ${teamData.name} now has ${updatedTeam.players?.length || 0} players and ${updatedTeam.coaches?.length || 0} coaches`);
          } else {
            this.logger.log(`Could not reload team ${teamData.name} after update`);
          }
          
        } catch (error) {
          this.logger.error(`Error processing squad for team ${teamData.name}: ${error.message}`);
          // Continue with next team even if one fails
        }
      }

      // Save updated competition and reload with all relations
      this.logger.log(`Completed importing league ${competitionData.name} with ${totalTeams} teams`);
      await this.competitionRepository.save(competition);
      
      // Reload competition with all relations to return complete data
      const fullCompetition = await this.competitionRepository.findOne({
        where: { id: competition.id },
        relations: ['teams', 'teams.players', 'teams.coaches'],
      });
      
      this.importStatusService.setImportComplete();
      if (!fullCompetition) {
        throw new Error(`Could not find competition after import: ${leagueCode}`);
      }
      return fullCompetition;
    } catch (error) {
      this.logger.error(`Error importing league ${leagueCode}: ${error.message}`);
      this.importStatusService.setImportError(error.message);
      throw error;
    }
  }
} 