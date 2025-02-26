import { Injectable } from '@nestjs/common';

export interface ImportStatus {
  isImporting: boolean;
  leagueCode: string | null;
  progress: number;
  teamsProcessed: number;
  totalTeams: number;
  lastUpdated: Date | null;
  error: string | null;
}

@Injectable()
export class ImportStatusService {
  private status: ImportStatus = {
    isImporting: false,
    leagueCode: null,
    progress: 0,
    teamsProcessed: 0,
    totalTeams: 0,
    lastUpdated: null,
    error: null,
  };

  setImportStarted(leagueCode: string, totalTeams: number) {
    this.status = {
      isImporting: true,
      leagueCode,
      progress: 0,
      teamsProcessed: 0,
      totalTeams,
      lastUpdated: new Date(),
      error: null,
    };
  }

  updateProgress(teamsProcessed: number) {
    this.status.teamsProcessed = teamsProcessed;
    this.status.progress = Math.round((teamsProcessed / this.status.totalTeams) * 100);
    this.status.lastUpdated = new Date();
  }

  setImportComplete() {
    this.status.isImporting = false;
    this.status.progress = 100;
    this.status.lastUpdated = new Date();
  }

  setImportError(error: string) {
    this.status.isImporting = false;
    this.status.error = error;
    this.status.lastUpdated = new Date();
  }

  getStatus(): ImportStatus {
    return this.status;
  }
} 