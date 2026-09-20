import { useLocalSearchParams } from "expo-router";

import NoteEditor from "@/modules/editor/screens/NoteEditor";

export default function NoteRoute() {
    const { noteId } = useLocalSearchParams<{ noteId: string }>();

    // Keyed by id so switching notes mounts a fresh editor rather than trying to
    // swap content inside the existing one.
    return <NoteEditor key={noteId} noteId={noteId} />;
}
