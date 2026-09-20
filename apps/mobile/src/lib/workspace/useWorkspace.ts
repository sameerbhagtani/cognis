import { useContext } from "react";

import WorkspaceContext from "./WorkspaceContext";

export default function useWorkspace() {
    const context = useContext(WorkspaceContext);

    if (!context) {
        throw new Error("useWorkspace must be used inside a WorkspaceProvider");
    }

    return context;
}
