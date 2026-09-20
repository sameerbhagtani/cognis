import { useContext } from "react";

import { ChatsContext } from "./ChatsProvider";

export { default as ChatsProvider } from "./ChatsProvider";
export type { ChatsContextType } from "./ChatsProvider";

export function useChats() {
    const context = useContext(ChatsContext);

    if (!context) {
        throw new Error("useChats must be used inside a ChatsProvider");
    }

    return context;
}
