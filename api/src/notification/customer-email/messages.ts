import type { Locale } from "@readyyet/db";
import type { NotifyingStatusCode } from "@readyyet/shared";

export type CustomerEmailKind = "TICKET_CREATED" | NotifyingStatusCode;

interface MessageParams {
  location: string;
  title: string;
}

interface KindMessages {
  subject: (params: MessageParams) => string;
  body: (params: MessageParams) => string;
}

interface LocaleMessages {
  greeting: (name: string) => string;
  trackButton: string;
  contact: (location: string) => string;
  stopUpdates: string;
  footer: (location: string) => string;
  kinds: Record<CustomerEmailKind, KindMessages>;
}

// Every customer email's wording, per locale. CANCELLED and REJECTED only
// ever point the customer to the shop, there's no staff-written reason
// (ADR 0015). French uses a non-breaking space before ":" and "?".
export const MESSAGES: Record<Locale, LocaleMessages> = {
  EN: {
    greeting: (name) => `Hello ${name},`,
    trackButton: "Follow your job",
    contact: (location) => `Questions? Contact ${location}:`,
    stopUpdates: "Stop email updates for this job",
    footer: (location) => `${location} uses ReadyYet to keep you updated on your job.`,
    kinds: {
      TICKET_CREATED: {
        subject: ({ location }) => `Your job at ${location} is registered`,
        body: ({ location, title }) =>
          `${location} has registered your job "${title}". You can follow its progress at any time, no account needed.`,
      },
      READY: {
        subject: ({ location }) => `Your job at ${location} is ready`,
        body: ({ location, title }) => `Good news: your job "${title}" is ready. You can collect it at ${location}.`,
      },
      AWAITING_APPROVAL: {
        subject: ({ location }) => `${location} needs your approval`,
        body: ({ location, title }) =>
          `${location} has prepared a quote for your job "${title}" and needs your approval before going further. Please contact ${location} with your answer.`,
      },
      AWAITING_CLIENT_INFO: {
        subject: ({ location }) => `${location} needs some information from you`,
        body: ({ location, title }) =>
          `${location} needs some information from you to continue working on your job "${title}". Please contact ${location}.`,
      },
      CANCELLED: {
        subject: ({ location }) => `Your job at ${location} was cancelled`,
        body: ({ location, title }) =>
          `Your job "${title}" was cancelled. Please contact ${location} to arrange collecting your item.`,
      },
      REJECTED: {
        subject: ({ location }) => `Your job at ${location} couldn't be completed`,
        body: ({ location, title }) =>
          `${location} wasn't able to complete your job "${title}". Please contact ${location} to arrange collecting your item.`,
      },
    },
  },
  FR: {
    greeting: (name) => `Bonjour ${name},`,
    trackButton: "Suivre mon dépôt",
    contact: (location) => `Une question\u00a0? Contactez ${location}\u00a0:`,
    stopUpdates: "Ne plus recevoir d'e-mails pour ce dépôt",
    footer: (location) => `${location} utilise ReadyYet pour vous tenir informé de l'avancement de votre dépôt.`,
    kinds: {
      TICKET_CREATED: {
        subject: ({ location }) => `Votre dépôt chez ${location} est enregistré`,
        body: ({ location, title }) =>
          `${location} a enregistré votre dépôt «\u00a0${title}\u00a0». Vous pouvez suivre son avancement à tout moment, sans créer de compte.`,
      },
      READY: {
        subject: ({ location }) => `Votre dépôt chez ${location} est prêt`,
        body: ({ location, title }) =>
          `Bonne nouvelle\u00a0: votre dépôt «\u00a0${title}\u00a0» est prêt. Vous pouvez venir le récupérer chez ${location}.`,
      },
      AWAITING_APPROVAL: {
        subject: ({ location }) => `${location} attend votre accord`,
        body: ({ location, title }) =>
          `${location} a préparé un devis pour votre dépôt «\u00a0${title}\u00a0» et attend votre accord pour continuer. Merci de contacter ${location} pour donner votre réponse.`,
      },
      AWAITING_CLIENT_INFO: {
        subject: ({ location }) => `${location} a besoin d'informations de votre part`,
        body: ({ location, title }) =>
          `${location} a besoin d'informations de votre part pour continuer à travailler sur votre dépôt «\u00a0${title}\u00a0». Merci de contacter ${location}.`,
      },
      CANCELLED: {
        subject: ({ location }) => `Votre dépôt chez ${location} a été annulé`,
        body: ({ location, title }) =>
          `Votre dépôt «\u00a0${title}\u00a0» a été annulé. Merci de contacter ${location} pour convenir de la récupération de votre article.`,
      },
      REJECTED: {
        subject: ({ location }) => `Votre dépôt chez ${location} n'a pas pu être traité`,
        body: ({ location, title }) =>
          `${location} n'a pas pu effectuer le travail prévu sur votre dépôt «\u00a0${title}\u00a0». Merci de contacter ${location} pour convenir de la récupération de votre article.`,
      },
    },
  },
};
