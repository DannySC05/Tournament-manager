export type { Tournament, TournamentStatus } from '../../core/tournaments/tournament.models';
export type { Team } from '../../core/teams/team.models';
export type { Match, MatchStatus } from '../../core/matches/match.models';
import type { Tournament } from '../../core/tournaments/tournament.models';
import type { Team } from '../../core/teams/team.models';
import type { Match } from '../../core/matches/match.models';

export interface DashboardData {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  isPreview: boolean;
}
