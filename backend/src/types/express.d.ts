import type { PublicUser } from '../modules/users/user.types.js';
import type { StoredSession } from '../modules/auth/session.service.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: PublicUser;
        sessionToken: string;
        session: StoredSession;
      };
    }
  }
}

export {};
