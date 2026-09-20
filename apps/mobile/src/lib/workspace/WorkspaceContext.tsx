import { createContext } from "react";

import type { WorkspaceContextType } from "./types";

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export default WorkspaceContext;
