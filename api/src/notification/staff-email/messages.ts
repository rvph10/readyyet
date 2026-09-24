import type { InvitationRole, Locale } from "@readyyet/db";

interface InvitationParams {
  inviter: string;
  location: string;
  business: string;
  role: InvitationRole;
  email: string;
  expiresInDays: number;
}

interface TransferParams {
  business: string;
  previousOwner: string;
  newOwner: string;
  newOwnerEmail: string;
}

interface TrialEndingParams {
  location: string;
  days: number;
}

interface StaffMessages {
  signInCode: {
    subject: string;
    preview: string;
    intro: string;
    expiry: (minutes: number) => string;
    ignore: string;
  };
  invitation: {
    subject: (params: InvitationParams) => string;
    body: (params: InvitationParams) => string;
    signInWith: (params: InvitationParams) => string;
    button: string;
    expiry: (params: InvitationParams) => string;
    ignore: string;
  };
  newOwner: {
    subject: (params: TransferParams) => string;
    body: (params: TransferParams) => string;
    powers: string;
    button: string;
  };
  accountDeleted: {
    subject: string;
    body: (email: string) => string;
    history: string;
    newAccount: string;
    notYou: string;
  };
  previousOwner: {
    subject: (params: TransferParams) => string;
    body: (params: TransferParams) => string;
    stillAdmin: string;
    notYou: string;
  };
  trialEnding: {
    subject: (params: TrialEndingParams) => string;
    body: (params: TrialEndingParams) => string;
    kept: string;
    button: string;
  };
}

const ROLES: Record<Locale, Record<InvitationRole, string>> = {
  EN: { ADMIN: "an admin", EMPLOYEE: "an employee" },
  FR: { ADMIN: "administrateur", EMPLOYEE: "employé" },
};

export const MESSAGES: Record<Locale, StaffMessages> = {
  EN: {
    signInCode: {
      subject: "Your ReadyYet sign-in code",
      preview: "Your code to sign in to ReadyYet",
      intro: "Enter this code to sign in to ReadyYet:",
      expiry: (minutes) => `It expires in ${minutes} minutes and can only be used once.`,
      ignore: "If you didn't try to sign in, you can ignore this email. Nobody can sign in without this code.",
    },
    invitation: {
      subject: ({ inviter, location }) => `${inviter} invited you to join ${location} on ReadyYet`,
      body: ({ inviter, location, business, role }) =>
        `${inviter} invited you to join the team at ${location} (${business}) as ${ROLES.EN[role]}.`,
      signInWith: ({ email }) => `To accept, sign in with this email address: ${email}.`,
      button: "Accept the invitation",
      expiry: ({ expiresInDays }) => `This invitation expires in ${expiresInDays} days.`,
      ignore: "If you weren't expecting this invitation, you can ignore this email.",
    },
    newOwner: {
      subject: ({ business }) => `You're now the owner of ${business} on ReadyYet`,
      body: ({ business, previousOwner }) =>
        `${previousOwner} transferred ${business} to you, you're now its owner at every one of its locations.`,
      powers:
        "As the owner, you alone can add or delete locations, make someone an admin or remove one, and transfer the business.",
      button: "Open ReadyYet",
    },
    previousOwner: {
      subject: ({ business, newOwner }) => `You transferred ${business} to ${newOwner}`,
      body: ({ business, newOwner, newOwnerEmail }) =>
        `${business} now belongs to ${newOwner} (${newOwnerEmail}), as you asked.`,
      stillAdmin: "You remain an admin at each of its locations, until you choose to leave them.",
      notYou: "If you didn't make this transfer, reply to this email right away.",
    },
    accountDeleted: {
      subject: "Your ReadyYet account was deleted",
      body: (email) => `Your ReadyYet account (${email}) was deleted, you no longer have access to any location.`,
      history: "Tickets and changes you made stay in each shop's history, without your name or email address.",
      newAccount: "You can create a new account at any time by signing in with this address.",
      notYou: "If you didn't delete your account, reply to this email right away.",
    },
    trialEnding: {
      subject: ({ location, days }) =>
        `Your ReadyYet trial for ${location} ends in ${days} day${days === 1 ? "" : "s"}`,
      body: ({ location, days }) =>
        `The free trial of ReadyYet at ${location} ends in ${days} day${days === 1 ? "" : "s"}. Choose a plan to keep creating tickets and inviting your team.`,
      kept: "Tickets already open keep working, and your customers' tracking links stay online either way.",
      button: "Choose a plan",
    },
  },
  FR: {
    signInCode: {
      subject: "Votre code de connexion ReadyYet",
      preview: "Votre code pour vous connecter à ReadyYet",
      intro: "Saisissez ce code pour vous connecter à ReadyYet\u00a0:",
      expiry: (minutes) => `Il expire dans ${minutes}\u00a0minutes et ne peut servir qu'une fois.`,
      ignore:
        "Si vous n'avez pas essayé de vous connecter, ignorez cet e-mail. Personne ne peut se connecter sans ce code.",
    },
    invitation: {
      subject: ({ inviter, location }) => `${inviter} vous invite à rejoindre ${location} sur ReadyYet`,
      body: ({ inviter, location, business, role }) =>
        `${inviter} vous invite à rejoindre l'équipe de ${location} (${business}) en tant qu'${ROLES.FR[role]}.`,
      signInWith: ({ email }) => `Pour accepter, connectez-vous avec cette adresse e-mail\u00a0: ${email}.`,
      button: "Accepter l'invitation",
      expiry: ({ expiresInDays }) => `Cette invitation expire dans ${expiresInDays}\u00a0jours.`,
      ignore: "Si vous ne vous attendiez pas à cette invitation, ignorez cet e-mail.",
    },
    newOwner: {
      subject: ({ business }) => `Vous êtes maintenant propriétaire de ${business} sur ReadyYet`,
      body: ({ business, previousOwner }) =>
        `${previousOwner} vous a transféré ${business}, vous en êtes maintenant propriétaire, dans chacun de ses établissements.`,
      powers:
        "En tant que propriétaire, vous seul pouvez ajouter ou supprimer un établissement, nommer ou retirer un administrateur, et transférer l'entreprise.",
      button: "Ouvrir ReadyYet",
    },
    previousOwner: {
      subject: ({ business, newOwner }) => `Vous avez transféré ${business} à ${newOwner}`,
      body: ({ business, newOwner, newOwnerEmail }) =>
        `${business} appartient désormais à ${newOwner} (${newOwnerEmail}), comme vous l'avez demandé.`,
      stillAdmin:
        "Vous restez administrateur de chacun de ses établissements, jusqu'à ce que vous choisissiez de les quitter.",
      notYou: "Si vous n'êtes pas à l'origine de ce transfert, répondez à cet e-mail sans attendre.",
    },
    accountDeleted: {
      subject: "Votre compte ReadyYet a été supprimé",
      body: (email) => `Votre compte ReadyYet (${email}) a été supprimé, vous n'avez plus accès à aucun établissement.`,
      history:
        "Les tickets et modifications que vous avez faits restent dans l'historique de chaque commerce, sans votre nom ni votre adresse e-mail.",
      newAccount: "Vous pouvez créer un nouveau compte à tout moment en vous connectant avec cette adresse.",
      notYou: "Si vous n'avez pas supprimé votre compte, répondez à cet e-mail sans attendre.",
    },
    trialEnding: {
      subject: ({ location, days }) =>
        `Votre essai ReadyYet pour ${location} se termine dans ${days}\u00a0jour${days > 1 ? "s" : ""}`,
      body: ({ location, days }) =>
        `L'essai gratuit de ReadyYet pour ${location} se termine dans ${days}\u00a0jour${days > 1 ? "s" : ""}. Choisissez une formule pour continuer à créer des tickets et à inviter votre équipe.`,
      kept: "Les tickets en cours continuent de fonctionner, et les liens de suivi de vos clients restent en ligne dans tous les cas.",
      button: "Choisir une formule",
    },
  },
};
