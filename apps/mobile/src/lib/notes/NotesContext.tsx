import { createContext } from "react";

import type { NotesContextType } from "./types";

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export default NotesContext;
