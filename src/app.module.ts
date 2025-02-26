import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { FootballModule } from './football/football.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'football_data',
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      synchronize: true, // auto-generate schema on startup
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: {
        settings: {
          'request.credentials': 'same-origin',
        },
      },
      debug: true, // Enable debug mode
      context: ({ req, res }) => ({ req, res }),
      introspection: true,
      installSubscriptionHandlers: true,
    }),
    FootballModule,
  ],
})
export class AppModule {}
