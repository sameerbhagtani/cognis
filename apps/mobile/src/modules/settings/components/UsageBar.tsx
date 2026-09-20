import { StyleSheet, Text, View } from "react-native";

import useTheme from "@/lib/theme/useTheme";

import type { Theme } from "@cognis/types";
import type { SpendBucket } from "../types";

type UsageBarProps = {
    label: string;
    bucket: SpendBucket;
};

/**
 * Percentage leads, with the ledger's own micro-dollar figures underneath.
 * Indexing a normal workspace costs single-digit micros against a limit of
 * thousands, so anything that rounds - to a percent, or to dollars at any
 * sane number of decimal places - turns a real number into a zero and reads
 * as "this isn't being tracked".
 */
export function UsageBar({ label, bucket }: UsageBarProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    // A limit of zero would be a misconfigured account rather than a full one;
    // treat it as nothing used so the bar doesn't read as maxed out.
    const fraction = bucket.limitMicros > 0 ? bucket.spentMicros / bucket.limitMicros : 0;
    const percent = Math.min(100, fraction * 100);

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.percent}>{formatPercent(percent)}</Text>
            </View>

            <View style={styles.track}>
                {/* minWidth keeps a sliver visible for a spend too small to
                 *  round to a drawable width, rather than overstating the
                 *  fraction to make it show up. */}
                <View
                    style={[
                        styles.fill,
                        bucket.spentMicros > 0 && styles.fillNonZero,
                        {
                            width: `${percent}%`,
                            backgroundColor: percent >= 90 ? theme.danger : theme.primary,
                        },
                    ]}
                />
            </View>

            <Text style={styles.amounts}>
                {bucket.spentMicros.toLocaleString()} of {bucket.limitMicros.toLocaleString()} µ$
            </Text>
        </View>
    );
}

/** Never rounds a real spend down to a flat 0%. */
function formatPercent(percent: number) {
    if (percent === 0) return "0%";
    if (percent < 1) return "<1%";

    return `${Math.round(percent)}%`;
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            gap: 6,
        },
        labelRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        label: {
            fontSize: 14,
            color: theme.foreground,
        },
        percent: {
            fontSize: 13,
            color: theme.foreground,
            opacity: 0.6,
        },
        track: {
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: theme.inputBg,
        },
        fill: {
            height: "100%",
            borderRadius: 3,
        },
        fillNonZero: {
            minWidth: 3,
        },
        amounts: {
            fontSize: 12,
            color: theme.foreground,
            opacity: 0.45,
        },
    });
}
