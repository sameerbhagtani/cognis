import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import useTheme from "@/lib/theme/useTheme";

import type { Theme } from "@cognis/types";
import type { WorkspaceMemberDetail } from "../types";

type MemberRowProps = {
    member: WorkspaceMemberDetail;
    isYou: boolean;
    /** False for the owner's row, and for every row when you aren't the owner -
     *  the row then renders flat, with no affordance suggesting a menu. */
    actionable: boolean;
    onPress: () => void;
};

export function MemberRow({ member, isYou, actionable, onPress }: MemberRowProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    return (
        <Pressable
            onPress={onPress}
            disabled={!actionable}
            style={({ pressed }) => [styles.row, { opacity: pressed && actionable ? 0.7 : 1 }]}
        >
            <View style={styles.initialCircle}>
                <Text style={styles.initial}>{initialOf(member.user.name, member.user.email)}</Text>
            </View>

            <View style={styles.identity}>
                <Text style={styles.name} numberOfLines={1}>
                    {member.user.name}
                    {isYou ? " (you)" : ""}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                    {member.user.email}
                </Text>
            </View>

            <Text style={styles.role}>{member.role}</Text>

            {actionable && (
                <MaterialCommunityIcons
                    name="dots-vertical"
                    size={18}
                    color={theme.foreground}
                    style={styles.chevron}
                />
            )}
        </Pressable>
    );
}

/** Falls back to the email when a name is blank, so the circle is never empty. */
function initialOf(name: string, email: string) {
    const source = name.trim() || email;

    return source.charAt(0).toUpperCase();
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 10,
        },
        initialCircle: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${theme.primary}26`,
        },
        initial: {
            fontSize: 15,
            fontWeight: "700",
            color: theme.primary,
        },
        identity: {
            flex: 1,
            gap: 2,
        },
        name: {
            fontSize: 15,
            color: theme.foreground,
        },
        email: {
            fontSize: 12,
            color: theme.foreground,
            opacity: 0.5,
        },
        role: {
            fontSize: 12,
            textTransform: "capitalize",
            color: theme.foreground,
            opacity: 0.6,
        },
        chevron: {
            opacity: 0.6,
        },
    });
}
