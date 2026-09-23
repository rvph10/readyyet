import type { InvitationRole, Locale } from "@readyyet/db";

interface InvitationParams {
  inviter: string;
  location: string;
  business: string;
  role: InvitationRole;
  email: string;
  expiresInDays: number;
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
  },
};
