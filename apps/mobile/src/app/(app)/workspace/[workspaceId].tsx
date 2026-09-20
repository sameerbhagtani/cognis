import { useLocalSearchParams } from "expo-router";

import WorkspaceSettings from "@/modules/workspace/screens/WorkspaceSettings";

export default function WorkspaceRoute() {
    const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();

    // Keyed by id so opening a different workspace mounts a fresh screen rather
    // than showing the previous one's members while the new list loads.
    return <WorkspaceSettings key={workspaceId} workspaceId={workspaceId} />;
}
