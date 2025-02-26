import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competition } from './entities/competition.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { Coach } from './entities/coach.entity';
import { FootballDataService } from './services/football-data.service';
import { ImportStatusService } from './services/import-status.service';
import { CompetitionResolver, TeamResolver, PlayerResolver, CoachResolver } from './resolvers/football.resolver';
import { StatusController } from './controllers/status.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Competition, Team, Player, Coach]),
  ],
  providers: [
    FootballDataService,
    ImportStatusService,
    CompetitionResolver,
    TeamResolver,
    PlayerResolver,
    CoachResolver,
  ],
  controllers: [StatusController],
})
export class FootballModule {} 