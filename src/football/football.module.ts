import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Competition } from './entities/competition.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { Coach } from './entities/coach.entity';
import { FootballDataService } from './services/football-data.service';
import { ImportStatusService } from './services/import-status.service';
import { CompetitionResolver, TeamResolver, PlayerResolver, CoachResolver } from './resolvers/football.resolver';
import { StatusController } from './controllers/status.controller';
import { FootballController } from './controllers/football.controller';
import { FootballService } from './services/football.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Competition, Team, Player, Coach]),
  ],
  providers: [
    FootballDataService,
    ImportStatusService,
    CompetitionResolver,
    TeamResolver,
    PlayerResolver,
    CoachResolver,
    FootballService,
  ],
  controllers: [FootballController, StatusController],
  exports: [FootballService],
})
export class FootballModule {} 