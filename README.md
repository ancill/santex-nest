# Football Data API

A GraphQL API built with NestJS that imports and queries football data from football-data.org.

## Technologies Used

- NestJS: A progressive Node.js framework for building efficient and scalable server-side applications
- GraphQL: A query language for APIs and a runtime for executing those queries
- TypeORM: ORM for TypeScript and JavaScript
- PostgreSQL: Relational database for storing the data
- Docker: For containerization and easy deployment

## Running the Application

### With Docker (Recommended)

```bash
# Start the application with Docker Compose
docker-compose up
```

### Without Docker

1. Start the PostgreSQL database:

```bash
# Make the script executable
chmod +x start-db.sh

# Run the database
./start-db.sh
```

2. Install dependencies and start the application:

```bash
# Install dependencies
npm install

# Start the application
npm run start:dev
```

## API Usage

Once the application is running, you can access the GraphQL Playground at:
http://localhost:3000/graphql

### Importing a League

```graphql
mutation {
  importLeague(leagueCode: "PL") {
    name
    code
    areaName
    teams {
      name
    }
  }
}
```

### Querying Players by League

```graphql
query {
  players(leagueCode: "PL") {
    name
    position
    dateOfBirth
    nationality
    team {
      name
    }
  }
}
```

### Querying Players by League and Team

```graphql
query {
  players(leagueCode: "PL", teamName: "Manchester United FC") {
    name
    position
    dateOfBirth
    nationality
  }
}
```

### Querying Coaches by League

```graphql
query {
  coaches(leagueCode: "PL") {
    name
    dateOfBirth
    nationality
    team {
      name
    }
  }
}
```

### Querying a Team with Players

```graphql
query {
  team(name: "Manchester United FC") {
    name
    tla
    shortName
    areaName
    address
    players {
      name
      position
    }
  }
}
```

## Handling API Rate Limits

The football-data.org API has rate limits for free tokens. This application handles them by:

1. Adding a delay between API requests (6 seconds)
2. Storing imported data in the database to minimize API requests
3. Only fetching new data when necessary

## Implementation Details

- The application uses TypeORM with a PostgreSQL database
- GraphQL is implemented using NestJS's GraphQL module with code-first approach
- The database schema is automatically generated on first run
- Docker support for easy deployment
- Proper error handling for API requests

## Available League Codes

For testing with the free API token, you can use the following league codes:

- `PL` - English Premier League
- `CL` - UEFA Champions League
- `PD` - Spanish La Liga

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

### Checking Import Status

The import operation can take a while due to API rate limits. You can check the status of an ongoing import by accessing:

```
GET http://localhost:3000/status/import
```

This will return information about the current import process, including:

- Whether an import is currently running
- Which league is being imported
- How many teams have been processed
- The current progress percentage
