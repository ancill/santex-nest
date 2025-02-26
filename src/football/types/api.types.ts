export interface ApiCompetition {
  name: string;
  code: string;
  area: { name: string };
}

export interface ApiTeam {
  id: number;
  name: string;
  tla: string;
  shortName: string;
  area?: { name: string };
  address: string;
}

export interface ApiSquadMember {
  name: string;
  position?: string;
  dateOfBirth?: string;
  nationality?: string;
  role?: string;
}

export interface ApiCoach {
  name: string;
  dateOfBirth?: string;
  nationality?: string;
}

export interface ApiCompetitionTeamsResponse {
  teams: ApiTeam[];
}

export interface ApiTeamResponse {
  coach: ApiCoach;
  squad: ApiSquadMember[];
} 