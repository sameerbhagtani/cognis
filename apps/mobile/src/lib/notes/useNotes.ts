import { useContext } from "react";

import NotesContext from "./NotesContext";

export default function useNotes() {
    const context = useContext(NotesContext);

    if (!context) {
        throw new Error("useNotes must be used inside a NotesProvider");
    }

    return context;
}
