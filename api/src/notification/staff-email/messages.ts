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

interface WelcomeParams {
  location: string;
  // Formatted in the User's language.
  trialEndsOn: string;
}

interface JoinedParams {
  member: string;
  memberEmail: string;
  location: string;
  business: string;
  role: InvitationRole;
}

interface FeedbackParams {
  location: string;
  customer: string;
  title: string;
  stars: number | null;
}

interface StaffMessages {
  signInCode: {
    subject: string;
    headline: string;
    label: string;
    preview: string;
    intro: string;
    expiry: (minutes: number) => string;
    ignore: string;
  };
  invitation: {
    subject: (params: InvitationParams) => string;
    headline: (params: InvitationParams) => string;
    label: string;
    asRole: (params: InvitationParams) => string;
    body: (params: InvitationParams) => string;
    signInWith: (params: InvitationParams) => string;
    button: string;
    expiry: (params: InvitationParams) => string;
    ignore: string;
  };
  newOwner: {
    subject: (params: TransferParams) => string;
    headline: (params: TransferParams) => string;
    body: (params: TransferParams) => string;
    powers: string;
    button: string;
  };
  accountDeleted: {
    subject: string;
    headline: string;
    body: (email: string) => string;
    history: string;
    newAccount: string;
    notYou: string;
  };
  previousOwner: {
    subject: (params: TransferParams) => string;
    headline: string;
    body: (params: TransferParams) => string;
    stillAdmin: string;
    notYou: string;
  };
  trialEnding: {
    subject: (params: TrialEndingParams) => string;
    headline: (params: TrialEndingParams) => string;
    body: (params: TrialEndingParams) => string;
    kept: string;
    button: string;
  };
  feedbackReceived: {
    subject: (params: FeedbackParams) => string;
    headline: string;
    body: (params: FeedbackParams) => string;
    // A rating of 1 or 2 with no message, which needs a follow-up too.
    lowRatingSubject: (params: FeedbackParams) => string;
    lowRating: (params: FeedbackParams) => string;
    button: string;
  };
  welcome: {
    subject: (params: WelcomeParams) => string;
    headline: string;
    body: (params: WelcomeParams) => string;
    trialLabel: string;
    trialValue: string;
    trialDetail: (params: WelcomeParams) => string;
    stepsTitle: string;
    steps: string[];
    button: string;
    help: string;
  };
  joinedTeam: {
    subject: (params: JoinedParams) => string;
    headline: (params: JoinedParams) => string;
    label: string;
    body: (params: JoinedParams) => string;
    button: (params: JoinedParams) => string;
  };
  memberJoined: {
    subject: (params: JoinedParams) => string;
    headline: (params: JoinedParams) => string;
    body: (params: JoinedParams) => string;
    button: string;
  };
}

const ROLES: Record<Locale, Record<InvitationRole, string>> = {
  EN: { ADMIN: "an admin", EMPLOYEE: "an employee" },
  FR: { ADMIN: "administrateur", EMPLOYEE: "employé" },
};

const ROLE_NAMES: Record<Locale, Record<InvitationRole, string>> = {
  EN: { ADMIN: "Admin", EMPLOYEE: "Employee" },
  FR: { ADMIN: "Administrateur", EMPLOYEE: "Employé" },
};

export { ROLE_NAMES };

export const MESSAGES: Record<Locale, StaffMessages> = {
  EN: {
    signInCode: {
      subject: "Your ReadyYet sign-in code",
      headline: "Your sign-in code",
      label: "Sign-in code",
      preview: "Your code to sign in to ReadyYet",
      intro: "Enter this code to sign in to ReadyYet:",
      expiry: (minutes) => `It expires in ${minutes} minutes and can only be used once.`,
      ignore: "If you didn't try to sign in, you can ignore this email. Nobody can sign in without this code.",
    },
    invitation: {
      subject: ({ inviter, location }) => `${inviter} invited you to join ${location} on ReadyYet`,
      headline: ({ location }) => `Join the team at ${location}`,
      label: "Invitation",
      asRole: ({ business, role }) => `${business}, as ${ROLES.EN[role]}`,
      body: ({ inviter, location, business, role }) =>
        `${inviter} invited you to join the team at ${location} (${business}) as ${ROLES.EN[role]}.`,
      signInWith: ({ email }) => `To accept, sign in with this email address: ${email}.`,
      button: "Accept the invitation",
      expiry: ({ expiresInDays }) => `This invitation expires in ${expiresInDays} days.`,
      ignore: "If you weren't expecting this invitation, you can ignore this email.",
    },
    newOwner: {
      subject: ({ business }) => `You're now the owner of ${business} on ReadyYet`,
      headline: ({ business }) => `${business} is yours now`,
      body: ({ business, previousOwner }) =>
        `${previousOwner} transferred ${business} to you, you're now its owner at every one of its shops.`,
      powers:
        "As the owner, you alone can add or delete shops, make someone an admin or remove one, and transfer the business.",
      button: "Open ReadyYet",
    },
    previousOwner: {
      subject: ({ business, newOwner }) => `You transferred ${business} to ${newOwner}`,
      headline: "Transfer done",
      body: ({ business, newOwner, newOwnerEmail }) =>
        `${business} now belongs to ${newOwner} (${newOwnerEmail}), as you asked.`,
      stillAdmin: "You remain an admin at each of its shops, until you choose to leave them.",
      notYou: "If you didn't make this transfer, reply to this email right away.",
    },
    accountDeleted: {
      subject: "Your ReadyYet account was deleted",
      headline: "Your account was deleted",
      body: (email) => `Your ReadyYet account (${email}) was deleted, you no longer have access to any shop.`,
      history: "Tickets and changes you made stay in each shop's history, without your name or email address.",
      newAccount: "You can create a new account at any time by signing in with this address.",
      notYou: "If you didn't delete your account, reply to this email right away.",
    },
    trialEnding: {
      subject: ({ location, days }) =>
        `Your ReadyYet trial for ${location} ends in ${days} day${days === 1 ? "" : "s"}`,
      headline: ({ days }) => `${days} day${days === 1 ? "" : "s"} left in your trial`,
      body: ({ location, days }) =>
        `The free trial of ReadyYet at ${location} ends in ${days} day${days === 1 ? "" : "s"}. Choose a plan to keep creating tickets and inviting your team.`,
      kept: "Tickets already open keep working, and your customers' tracking links stay online either way.",
      button: "Choose a plan",
    },
    feedbackReceived: {
      subject: ({ location, customer }) => `${customer} sent private feedback to ${location}`,
      headline: "A Customer needs you",
      body: ({ customer, title }) => `${customer} wrote about "${title}", only your team can see it:`,
      lowRatingSubject: ({ location, customer, stars }) => `${customer} gave ${location} ${stars} out of 5`,
      lowRating: ({ customer, title, stars }) =>
        `${customer} rated "${title}" ${stars} out of 5 without writing anything. A quick call can still put it right.`,
      button: "See the feedback",
    },
    welcome: {
      subject: ({ location }) => `Welcome to ReadyYet, ${location} is ready`,
      headline: "Welcome to ReadyYet",
      body: ({ location }) =>
        `${location} is set up. From now on, your customers follow their items themselves, and you get fewer calls asking if it's ready yet.`,
      trialLabel: "Your Pro trial",
      trialValue: "14 days free",
      trialDetail: ({ trialEndsOn }) => `Until ${trialEndsOn}. No card needed.`,
      stepsTitle: "Three steps to get going",
      steps: [
        "Create a Ticket for an item you have in the shop: the customer gets their tracking link by email.",
        "Move it along its Workflow. Each step tells the customer where it stands.",
        "Invite your team, so everyone at the counter can do the same.",
      ],
      button: "Open ReadyYet",
      help: "Questions? Reply to this email, a person reads every one.",
    },
    joinedTeam: {
      subject: ({ location }) => `You're in the team at ${location}`,
      headline: ({ location }) => `Welcome to ${location}`,
      label: "Your role",
      body: ({ location }) =>
        `You can now create Tickets at ${location} and keep its customers updated, right from ReadyYet.`,
      button: ({ location }) => `Open ${location}`,
    },
    memberJoined: {
      subject: ({ member, location }) => `${member} joined ${location}`,
      headline: ({ member }) => `${member} joined your team`,
      body: ({ member, memberEmail, location, role }) =>
        `${member} (${memberEmail}) accepted your invitation and joined ${location} as ${ROLES.EN[role]}.`,
      button: "See your team",
    },
  },
  FR: {
    signInCode: {
      subject: "Votre code de connexion ReadyYet",
      headline: "Votre code de connexion",
      label: "Code de connexion",
      preview: "Votre code pour vous connecter à ReadyYet",
      intro: "Saisissez ce code pour vous connecter à ReadyYet\u00a0:",
      expiry: (minutes) => `Il expire dans ${minutes}\u00a0minutes et ne peut servir qu'une fois.`,
      ignore:
        "Si vous n'avez pas essayé de vous connecter, ignorez cet e-mail. Personne ne peut se connecter sans ce code.",
    },
    invitation: {
      subject: ({ inviter, location }) => `${inviter} vous invite à rejoindre ${location} sur ReadyYet`,
      headline: ({ location }) => `Rejoignez l'équipe de ${location}`,
      label: "Invitation",
      asRole: ({ business, role }) => `${business}, en tant qu'${ROLES.FR[role]}`,
      body: ({ inviter, location, business, role }) =>
        `${inviter} vous invite à rejoindre l'équipe de ${location} (${business}) en tant qu'${ROLES.FR[role]}.`,
      signInWith: ({ email }) => `Pour accepter, connectez-vous avec cette adresse e-mail\u00a0: ${email}.`,
      button: "Accepter l'invitation",
      expiry: ({ expiresInDays }) => `Cette invitation expire dans ${expiresInDays}\u00a0jours.`,
      ignore: "Si vous ne vous attendiez pas à cette invitation, ignorez cet e-mail.",
    },
    newOwner: {
      subject: ({ business }) => `Vous êtes maintenant propriétaire de ${business} sur ReadyYet`,
      headline: ({ business }) => `${business} est à vous`,
      body: ({ business, previousOwner }) =>
        `${previousOwner} vous a transféré ${business}, vous en êtes maintenant propriétaire, dans chacun de ses magasins.`,
      powers:
        "En tant que propriétaire, vous seul pouvez ajouter ou supprimer un magasin, nommer ou retirer un administrateur, et transférer l'entreprise.",
      button: "Ouvrir ReadyYet",
    },
    previousOwner: {
      subject: ({ business, newOwner }) => `Vous avez transféré ${business} à ${newOwner}`,
      headline: "Transfert effectué",
      body: ({ business, newOwner, newOwnerEmail }) =>
        `${business} appartient désormais à ${newOwner} (${newOwnerEmail}), comme vous l'avez demandé.`,
      stillAdmin:
        "Vous restez administrateur de chacun de ses magasins, jusqu'à ce que vous choisissiez de les quitter.",
      notYou: "Si vous n'êtes pas à l'origine de ce transfert, répondez à cet e-mail sans attendre.",
    },
    accountDeleted: {
      subject: "Votre compte ReadyYet a été supprimé",
      headline: "Votre compte a été supprimé",
      body: (email) => `Votre compte ReadyYet (${email}) a été supprimé, vous n'avez plus accès à aucun magasin.`,
      history:
        "Les tickets et modifications que vous avez faits restent dans l'historique de chaque commerce, sans votre nom ni votre adresse e-mail.",
      newAccount: "Vous pouvez créer un nouveau compte à tout moment en vous connectant avec cette adresse.",
      notYou: "Si vous n'avez pas supprimé votre compte, répondez à cet e-mail sans attendre.",
    },
    trialEnding: {
      subject: ({ location, days }) =>
        `Votre essai ReadyYet pour ${location} se termine dans ${days}\u00a0jour${days > 1 ? "s" : ""}`,
      headline: ({ days }) => `Plus que ${days}\u00a0jour${days > 1 ? "s" : ""} d'essai`,
      body: ({ location, days }) =>
        `L'essai gratuit de ReadyYet pour ${location} se termine dans ${days}\u00a0jour${days > 1 ? "s" : ""}. Choisissez une formule pour continuer à créer des tickets et à inviter votre équipe.`,
      kept: "Les tickets en cours continuent de fonctionner, et les liens de suivi de vos clients restent en ligne dans tous les cas.",
      button: "Choisir une formule",
    },
    feedbackReceived: {
      subject: ({ location, customer }) => `${customer} a envoyé un avis privé à ${location}`,
      headline: "Un client a besoin de vous",
      body: ({ customer, title }) =>
        `${customer} a écrit à propos de «\u00a0${title}\u00a0», seule votre équipe peut le voir\u00a0:`,
      lowRatingSubject: ({ location, customer, stars }) => `${customer} a donné ${stars} sur 5 à ${location}`,
      lowRating: ({ customer, title, stars }) =>
        `${customer} a noté «\u00a0${title}\u00a0» ${stars} sur 5 sans rien écrire. Un appel peut encore arranger les choses.`,
      button: "Voir l'avis",
    },
    welcome: {
      subject: ({ location }) => `Bienvenue sur ReadyYet, ${location} est prêt`,
      headline: "Bienvenue sur ReadyYet",
      body: ({ location }) =>
        `${location} est configuré. Désormais, vos clients suivent eux-mêmes leurs articles, et vous recevez moins d'appels pour savoir si c'est prêt.`,
      trialLabel: "Votre essai Pro",
      trialValue: "14\u00a0jours offerts",
      trialDetail: ({ trialEndsOn }) => `Jusqu'au ${trialEndsOn}. Sans carte bancaire.`,
      stepsTitle: "Trois étapes pour démarrer",
      steps: [
        "Créez un ticket pour un article que vous avez en magasin\u00a0: le client reçoit son lien de suivi par e-mail.",
        "Faites-le avancer dans son Workflow. Chaque étape indique au client où il en est.",
        "Invitez votre équipe, pour que chacun au comptoir puisse faire de même.",
      ],
      button: "Ouvrir ReadyYet",
      help: "Une question\u00a0? Répondez à cet e-mail, une vraie personne lit chaque message.",
    },
    joinedTeam: {
      subject: ({ location }) => `Vous faites partie de l'équipe de ${location}`,
      headline: ({ location }) => `Bienvenue chez ${location}`,
      label: "Votre rôle",
      body: ({ location }) =>
        `Vous pouvez maintenant créer des tickets chez ${location} et tenir ses clients informés, directement depuis ReadyYet.`,
      button: ({ location }) => `Ouvrir ${location}`,
    },
    memberJoined: {
      subject: ({ member, location }) => `${member} a rejoint ${location}`,
      headline: ({ member }) => `${member} a rejoint votre équipe`,
      body: ({ member, memberEmail, location, role }) =>
        `${member} (${memberEmail}) a accepté votre invitation et a rejoint ${location} en tant qu'${ROLES.FR[role]}.`,
      button: "Voir votre équipe",
    },
  },
};
