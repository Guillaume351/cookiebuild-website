import { relations } from "drizzle-orm/relations";
import { matches, playerMatchPerformances, playerdata, playerSessions, matchPlayers, matchWinners } from "./schema";

export const playerMatchPerformancesRelations = relations(playerMatchPerformances, ({one}) => ({
	match: one(matches, {
		fields: [playerMatchPerformances.matchId],
		references: [matches.id]
	}),
	playerdatum: one(playerdata, {
		fields: [playerMatchPerformances.playerId],
		references: [playerdata.id]
	}),
}));

export const matchesRelations = relations(matches, ({many}) => ({
	playerMatchPerformances: many(playerMatchPerformances),
	matchPlayers: many(matchPlayers),
	matchWinners: many(matchWinners),
}));

export const playerdataRelations = relations(playerdata, ({many}) => ({
	playerMatchPerformances: many(playerMatchPerformances),
	playerSessions: many(playerSessions),
	matchPlayers: many(matchPlayers),
	matchWinners: many(matchWinners),
}));

export const playerSessionsRelations = relations(playerSessions, ({one}) => ({
	playerdatum: one(playerdata, {
		fields: [playerSessions.playerId],
		references: [playerdata.id]
	}),
}));

export const matchPlayersRelations = relations(matchPlayers, ({one}) => ({
	playerdatum: one(playerdata, {
		fields: [matchPlayers.playerId],
		references: [playerdata.id]
	}),
	match: one(matches, {
		fields: [matchPlayers.matchId],
		references: [matches.id]
	}),
}));

export const matchWinnersRelations = relations(matchWinners, ({one}) => ({
	playerdatum: one(playerdata, {
		fields: [matchWinners.playerId],
		references: [playerdata.id]
	}),
	match: one(matches, {
		fields: [matchWinners.matchId],
		references: [matches.id]
	}),
}));