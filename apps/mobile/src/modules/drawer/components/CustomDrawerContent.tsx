import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DrawerHeader } from "./DrawerHeader";
import { DrawerPager } from "./DrawerPager";
import { DrawerBottomBar } from "./DrawerBottomBar";
import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

export const CustomDrawerContent = (props: any) => {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const styles = createStyles(theme, insets);

    const closeDrawer = () => {
        props.navigation.closeDrawer();
    };

    return (
        <View style={styles.container}>
            <DrawerHeader onClose={closeDrawer} />
            <DrawerPager />
            <DrawerBottomBar />
        </View>
    );
};

const createStyles = (theme: Theme, insets: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
            paddingTop: insets.top,
            // DrawerBottomBar already handles bottom insets, so no bottom padding here to avoid double padding.
        },
    });
