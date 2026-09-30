import { sql, type SQL } from "drizzle-orm";

/** Languages with dedicated copy; every other locale falls back to English. */
export const ENGAGEMENT_COPY_LOCALES = ["en", "fr", "es", "de", "it", "pt"] as const;
export type EngagementCopyLocale = (typeof ENGAGEMENT_COPY_LOCALES)[number];

export interface EngagementCopy {
  digestTitle: string;
  digestPlayed: string;
  digestIdle: string;
  digestNextWednesday: string;
  digestNextSaturday: string;
  soireeReminderTitle: string;
  soireeReminderBody: string;
  soireeEventTitle: string;
  soireeEventDescription: string;
}

/**
 * Soirée Cookie runs every Wednesday and Saturday from 21:00 to 22:00, Paris
 * time, with double coins in game. Player-facing French copy uses « tu ».
 */
export const ENGAGEMENT_COPY = {
  en: {
    digestTitle: "Your Cookie Build week",
    digestPlayed: "Last week: {matches} matches played, {wins} won.",
    digestIdle: "No matches last week? Your friends are waiting on Cookie Build.",
    digestNextWednesday: "Next Soirée Cookie: Wednesday 9 pm (Paris time), double coins!",
    digestNextSaturday: "Next Soirée Cookie: Saturday 9 pm (Paris time), double coins!",
    soireeReminderTitle: "🍪 Soirée Cookie starts in 15 minutes",
    soireeReminderBody: "Double coins in every mini-game for one hour. Join play.cookie-build.com!",
    soireeEventTitle: "Soirée Cookie: double coins",
    soireeEventDescription:
      "Every Wednesday and Saturday from 9 pm to 10 pm (Paris time), every mini-game pays double coins. Bring your friends!",
  },
  fr: {
    digestTitle: "Ta semaine sur Cookie Build",
    digestPlayed: "La semaine dernière : {matches} parties jouées, {wins} gagnées.",
    digestIdle: "Pas de partie la semaine dernière ? Tes amis t’attendent sur Cookie Build.",
    digestNextWednesday: "Prochaine Soirée Cookie : mercredi à 21 h, pièces x2 !",
    digestNextSaturday: "Prochaine Soirée Cookie : samedi à 21 h, pièces x2 !",
    soireeReminderTitle: "🍪 La Soirée Cookie commence dans 15 minutes",
    soireeReminderBody: "Pièces x2 dans tous les mini-jeux pendant une heure. Rejoins play.cookie-build.com !",
    soireeEventTitle: "Soirée Cookie : pièces x2",
    soireeEventDescription:
      "Chaque mercredi et samedi de 21 h à 22 h (heure de Paris), tous les mini-jeux rapportent deux fois plus de pièces. Viens avec tes amis !",
  },
  es: {
    digestTitle: "Tu semana en Cookie Build",
    digestPlayed: "La semana pasada: {matches} partidas jugadas, {wins} ganadas.",
    digestIdle: "¿Sin partidas la semana pasada? Tus amigos te esperan en Cookie Build.",
    digestNextWednesday: "Próxima Soirée Cookie: miércoles a las 21:00 (hora de París), ¡monedas x2!",
    digestNextSaturday: "Próxima Soirée Cookie: sábado a las 21:00 (hora de París), ¡monedas x2!",
    soireeReminderTitle: "🍪 La Soirée Cookie empieza en 15 minutos",
    soireeReminderBody: "Monedas x2 en todos los minijuegos durante una hora. ¡Entra en play.cookie-build.com!",
    soireeEventTitle: "Soirée Cookie: monedas x2",
    soireeEventDescription:
      "Cada miércoles y sábado de 21:00 a 22:00 (hora de París), todos los minijuegos dan el doble de monedas. ¡Trae a tus amigos!",
  },
  de: {
    digestTitle: "Deine Woche auf Cookie Build",
    digestPlayed: "Letzte Woche: {matches} Runden gespielt, {wins} gewonnen.",
    digestIdle: "Letzte Woche nicht gespielt? Deine Freunde warten auf Cookie Build.",
    digestNextWednesday: "Nächste Soirée Cookie: Mittwoch 21 Uhr (Pariser Zeit), doppelte Münzen!",
    digestNextSaturday: "Nächste Soirée Cookie: Samstag 21 Uhr (Pariser Zeit), doppelte Münzen!",
    soireeReminderTitle: "🍪 Die Soirée Cookie beginnt in 15 Minuten",
    soireeReminderBody: "Eine Stunde lang doppelte Münzen in allen Minispielen. Komm auf play.cookie-build.com!",
    soireeEventTitle: "Soirée Cookie: doppelte Münzen",
    soireeEventDescription:
      "Jeden Mittwoch und Samstag von 21 bis 22 Uhr (Pariser Zeit) bringen alle Minispiele doppelte Münzen. Bring deine Freunde mit!",
  },
  it: {
    digestTitle: "La tua settimana su Cookie Build",
    digestPlayed: "La settimana scorsa: {matches} partite giocate, {wins} vinte.",
    digestIdle: "Nessuna partita la settimana scorsa? I tuoi amici ti aspettano su Cookie Build.",
    digestNextWednesday: "Prossima Soirée Cookie: mercoledì alle 21 (ora di Parigi), monete x2!",
    digestNextSaturday: "Prossima Soirée Cookie: sabato alle 21 (ora di Parigi), monete x2!",
    soireeReminderTitle: "🍪 La Soirée Cookie inizia tra 15 minuti",
    soireeReminderBody: "Monete x2 in tutti i minigiochi per un'ora. Entra su play.cookie-build.com!",
    soireeEventTitle: "Soirée Cookie: monete x2",
    soireeEventDescription:
      "Ogni mercoledì e sabato dalle 21 alle 22 (ora di Parigi) tutti i minigiochi danno il doppio delle monete. Porta i tuoi amici!",
  },
  pt: {
    digestTitle: "Sua semana no Cookie Build",
    digestPlayed: "Semana passada: {matches} partidas jogadas, {wins} vencidas.",
    digestIdle: "Nenhuma partida na semana passada? Seus amigos esperam você no Cookie Build.",
    digestNextWednesday: "Próxima Soirée Cookie: quarta às 21h (horário de Paris), moedas x2!",
    digestNextSaturday: "Próxima Soirée Cookie: sábado às 21h (horário de Paris), moedas x2!",
    soireeReminderTitle: "🍪 A Soirée Cookie começa em 15 minutos",
    soireeReminderBody: "Moedas x2 em todos os minijogos por uma hora. Entre em play.cookie-build.com!",
    soireeEventTitle: "Soirée Cookie: moedas x2",
    soireeEventDescription:
      "Toda quarta e sábado das 21h às 22h (horário de Paris), todos os minijogos dão o dobro de moedas. Traga seus amigos!",
  },
} as const satisfies Record<EngagementCopyLocale, EngagementCopy>;

export function engagementCopyLocale(locale: string | null | undefined): EngagementCopyLocale {
  const language = (locale ?? "").toLowerCase().replace(/_/g, "-").split("-", 1)[0] ?? "";
  return (ENGAGEMENT_COPY_LOCALES as readonly string[]).includes(language)
    ? (language as EngagementCopyLocale)
    : "en";
}

export function engagementCopy(locale: string | null | undefined): EngagementCopy {
  return ENGAGEMENT_COPY[engagementCopyLocale(locale)];
}

/** SQL expression resolving the copy language of a locale column. */
export function engagementLocaleSql(locale: SQL) {
  const languages = ENGAGEMENT_COPY_LOCALES.filter((code) => code !== "en");
  const serialized = JSON.stringify(languages);
  return sql`CASE WHEN ${serialized}::jsonb ? split_part(replace(lower(coalesce(${locale}, '')), '_', '-'), '-', 1)
    THEN split_part(replace(lower(coalesce(${locale}, '')), '_', '-'), '-', 1)
    ELSE 'en' END`;
}

export function engagementTextSql(locale: SQL, key: keyof EngagementCopy) {
  const serialized = JSON.stringify(ENGAGEMENT_COPY);
  return sql`coalesce(
    ${serialized}::jsonb -> (${engagementLocaleSql(locale)}) ->> ${key},
    ${serialized}::jsonb -> 'en' ->> ${key}
  )`;
}

/** Localized title/description map stored on generated mobile_events rows. */
export function soireeEventLocalizations() {
  return Object.fromEntries(
    ENGAGEMENT_COPY_LOCALES.map((code) => [
      code,
      {
        title: ENGAGEMENT_COPY[code].soireeEventTitle,
        description: ENGAGEMENT_COPY[code].soireeEventDescription,
      },
    ]),
  );
}
