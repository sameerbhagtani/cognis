import type { auth } from "../lib/auth.js";
import type { Folder } from "../modules/folder/service.js";
import type { WorkspaceMembership } from "../shared/services/workspaceAccess.js";

type AuthSession = typeof auth.$Infer.Session;

declare global {
    namespace Express {
        interface Request {
            user: AuthSession["user"];
            session: AuthSession["session"];
            workspaceMember?: WorkspaceMembership;
            folder?: Folder;
        }
    }
}
