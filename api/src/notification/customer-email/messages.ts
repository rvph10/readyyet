import type { Locale } from "@readyyet/db";
import type { NotifyingStatusCode } from "@readyyet/shared";

// READY_DATE_CHANGED: the estimated ready date moved later (ADR 0030).
export type CustomerEmailKind = "TICKET_CREATED" | "READY_DATE_CHANGED" | NotifyingStatusCode;

// What the email calls the customer's job, per business type ("your
// repair", "votre retouche"). French nouns carry their gender, the
// sentences around them agree with it.
interface JobNoun {
  word: string;
  feminine?: boolean;
}

const JOB_NOUNS: Record<Locale, { fallback: JobNoun; byBusinessType: Record<string, JobNoun> }> = {
  EN: {
    fallback: { word: "job" },
    byBusinessType: {
      PRESSING: { word: "order" },
      GARAGE: { word: "repair" },
      ELECTRONICS_REPAIR: { word: "repair" },
      LEATHER_GOODS: { word: "repair" },
      SHOE_REPAIR: { word: "repair" },
      WATCH_JEWELRY: { word: "repair" },
      BICYCLE_REPAIR: { word: "repair" },
      APPLIANCE_REPAIR: { word: "repair" },
      TAILORING: { word: "alteration" },
      FRAMING: { word: "framing order" },
    },
  },
  FR: {
    fallback: { word: "dépôt" },
    byBusinessType: {
      PRESSING: { word: "dépôt" },
      GARAGE: { word: "réparation", feminine: true },
      ELECTRONICS_REPAIR: { word: "réparation", feminine: true },
      LEATHER_GOODS: { word: "réparation", feminine: true },
      SHOE_REPAIR: { word: "réparation", feminine: true },
      WATCH_JEWELRY: { word: "réparation", feminine: true },
      BICYCLE_REPAIR: { word: "réparation", feminine: true },
      APPLIANCE_REPAIR: { word: "réparation", feminine: true },
      TAILORING: { word: "retouche", feminine: true },
      FRAMING: { word: "encadrement" },
    },
  },
};

export function jobNoun(locale: Locale, businessTypeCode: string): JobNoun {
  return JOB_NOUNS[locale].byBusinessType[businessTypeCode] ?? JOB_NOUNS[locale].fallback;
}

// French agreement: "prêt"/"prête", "mon dépôt"/"ma retouche" (but "mon"
// before a vowel either way), "ce dépôt"/"cet encadrement"/"cette retouche".
const startsWithVowel = (noun: JobNoun) => /^[aeiouhéè]/i.test(noun.word);
const agree = (noun: JobNoun, masculine: string, feminine: string) => (noun.feminine ? feminine : masculine);
const monMa = (noun: JobNoun) => (noun.feminine && !startsWithVowel(noun) ? "ma" : "mon");
const ceCetCette = (noun: JobNoun) => (noun.feminine ? "cette" : startsWithVowel(noun) ? "cet" : "ce");

interface MessageParams {
  location: string;
  title: string;
  job: JobNoun;
  // The estimated ready date, already written out ("Tuesday 29 September").
  readyDate: string;
}

interface KindMessages {
  subject: (params: MessageParams) => string;
  body: (params: MessageParams) => string;
}

interface LocaleMessages {
  greeting: (name: string) => string;
  trackButton: (job: JobNoun) => string;
  contact: (location: string) => string;
  stopUpdates: (job: JobNoun) => string;
  footer: (params: { location: string; job: JobNoun }) => string;
  readyBy: (params: { job: JobNoun; readyDate: string }) => string;
  kinds: Record<CustomerEmailKind, KindMessages>;
}

// Every customer email's wording, per locale. CANCELLED and REJECTED only
// ever point the customer to the shop, there's no staff-written reason
// (ADR 0015). French uses a non-breaking space before ":" and "?".
export const MESSAGES: Record<Locale, LocaleMessages> = {
  EN: {
    greeting: (name) => `Hello ${name},`,
    trackButton: (job) => `Follow your ${job.word}`,
    contact: (location) => `Questions? Contact ${location}:`,
    stopUpdates: (job) => `Stop email updates for this ${job.word}`,
    footer: ({ location, job }) => `${location} uses ReadyYet to keep you updated on your ${job.word}.`,
    readyBy: ({ readyDate }) => `It should be ready on ${readyDate}.`,
    kinds: {
      TICKET_CREATED: {
        subject: ({ location, job }) => `Your ${job.word} at ${location} is registered`,
        body: ({ location, title, job }) =>
          `${location} has registered your ${job.word} "${title}". You can follow its progress at any time, no account needed.`,
      },
      READY_DATE_CHANGED: {
        subject: ({ location, job }) => `New date for your ${job.word} at ${location}`,
        body: ({ location, title, job, readyDate }) =>
          `${location} needs a little more time for your ${job.word} "${title}". It should now be ready on ${readyDate}.`,
      },
      READY: {
        subject: ({ location, job }) => `Your ${job.word} at ${location} is ready`,
        body: ({ location, title, job }) =>
          `Good news: your ${job.word} "${title}" is ready. You can collect it at ${location}.`,
      },
      AWAITING_APPROVAL: {
        subject: ({ location }) => `${location} needs your approval`,
        body: ({ location, title, job }) =>
          `${location} has prepared a quote for your ${job.word} "${title}" and needs your approval before going further. Please contact ${location} with your answer.`,
      },
      AWAITING_CLIENT_INFO: {
        subject: ({ location }) => `${location} needs some information from you`,
        body: ({ location, title, job }) =>
          `${location} needs some information from you to continue working on your ${job.word} "${title}". Please contact ${location}.`,
      },
      CANCELLED: {
        subject: ({ location, job }) => `Your ${job.word} at ${location} was cancelled`,
        body: ({ location, title, job }) =>
          `Your ${job.word} "${title}" was cancelled. Please contact ${location} to arrange collecting your item.`,
      },
      REJECTED: {
        subject: ({ location, job }) => `Your ${job.word} at ${location} couldn't be completed`,
        body: ({ location, title, job }) =>
          `${location} wasn't able to complete your ${job.word} "${title}". Please contact ${location} to arrange collecting your item.`,
      },
    },
  },
  FR: {
    greeting: (name) => `Bonjour ${name},`,
    trackButton: (job) => `Suivre ${monMa(job)} ${job.word}`,
    contact: (location) => `Une question\u00a0? Contactez ${location}\u00a0:`,
    stopUpdates: (job) => `Ne plus recevoir d'e-mails pour ${ceCetCette(job)} ${job.word}`,
    footer: ({ location, job }) =>
      `${location} utilise ReadyYet pour vous tenir informé de l'avancement de votre ${job.word}.`,
    readyBy: ({ job, readyDate }) =>
      `${agree(job, "Il", "Elle")} devrait être ${agree(job, "prêt", "prête")} le ${readyDate}.`,
    kinds: {
      TICKET_CREATED: {
        subject: ({ location, job }) =>
          `Votre ${job.word} chez ${location} est ${agree(job, "enregistré", "enregistrée")}`,
        body: ({ location, title, job }) =>
          `${location} a enregistré votre ${job.word} «\u00a0${title}\u00a0». Vous pouvez suivre son avancement à tout moment, sans créer de compte.`,
      },
      READY_DATE_CHANGED: {
        subject: ({ location, job }) => `Nouvelle date pour votre ${job.word} chez ${location}`,
        body: ({ location, title, job, readyDate }) =>
          `${location} a besoin d'un peu plus de temps pour votre ${job.word} «\u00a0${title}\u00a0». ${agree(job, "Il", "Elle")} devrait maintenant être ${agree(job, "prêt", "prête")} le ${readyDate}.`,
      },
      READY: {
        subject: ({ location, job }) => `Votre ${job.word} chez ${location} est ${agree(job, "prêt", "prête")}`,
        body: ({ location, title, job }) =>
          `Bonne nouvelle\u00a0: votre ${job.word} «\u00a0${title}\u00a0» est ${agree(job, "prêt", "prête")}. Vous pouvez venir ${agree(job, "le", "la")} récupérer chez ${location}.`,
      },
      AWAITING_APPROVAL: {
        subject: ({ location }) => `${location} attend votre accord`,
        body: ({ location, title, job }) =>
          `${location} a préparé un devis pour votre ${job.word} «\u00a0${title}\u00a0» et attend votre accord pour continuer. Merci de contacter ${location} pour donner votre réponse.`,
      },
      AWAITING_CLIENT_INFO: {
        subject: ({ location }) => `${location} a besoin d'informations de votre part`,
        body: ({ location, title, job }) =>
          `${location} a besoin d'informations de votre part pour continuer à travailler sur votre ${job.word} «\u00a0${title}\u00a0». Merci de contacter ${location}.`,
      },
      CANCELLED: {
        subject: ({ location, job }) => `Votre ${job.word} chez ${location} a été ${agree(job, "annulé", "annulée")}`,
        body: ({ location, title, job }) =>
          `Votre ${job.word} «\u00a0${title}\u00a0» a été ${agree(job, "annulé", "annulée")}. Merci de contacter ${location} pour convenir de la récupération de votre article.`,
      },
      REJECTED: {
        subject: ({ location, job }) =>
          `Votre ${job.word} chez ${location} n'a pas pu être ${agree(job, "traité", "traitée")}`,
        body: ({ location, title, job }) =>
          `${location} n'a pas pu effectuer le travail prévu sur votre ${job.word} «\u00a0${title}\u00a0». Merci de contacter ${location} pour convenir de la récupération de votre article.`,
      },
    },
  },
};
