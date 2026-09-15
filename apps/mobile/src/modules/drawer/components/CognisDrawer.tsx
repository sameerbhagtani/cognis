import React, { forwardRef, useImperativeHandle, useCallback } from "react";
import { StyleSheet, useWindowDimensions, Pressable, View, Keyboard } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolation,
    useAnimatedProps,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context";

import { CognisDrawerRef } from "../types";
import { DrawerHeader } from "./DrawerHeader";
import { DrawerPager } from "./DrawerPager";
import { DrawerBottomBar } from "./DrawerBottomBar";

import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

interface Props {
    children: React.ReactNode;
}

const DRAWER_WIDTH_RATIO = 0.85;
const MAX_DRAWER_WIDTH = 400;
const SPRING_CONFIG = {
    damping: 20,
    stiffness: 200,
    mass: 0.8,
};

export const CognisDrawer = forwardRef<CognisDrawerRef, Props>(({ children }, ref) => {
    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const drawerWidth = Math.min(screenWidth * DRAWER_WIDTH_RATIO, MAX_DRAWER_WIDTH);
    const { theme } = useTheme();
    const styles = createStyles(theme, drawerWidth, insets);

    const translateX = useSharedValue(-drawerWidth);
    const isOpen = useSharedValue(false);

    const open = useCallback(() => {
        translateX.value = withSpring(0, SPRING_CONFIG);
        isOpen.value = true;
    }, [translateX, isOpen]);

    const close = useCallback(() => {
        Keyboard.dismiss();
        translateX.value = withSpring(-drawerWidth, SPRING_CONFIG);
        isOpen.value = false;
    }, [drawerWidth, translateX, isOpen]);

    const toggle = useCallback(() => {
        if (isOpen.value) {
            close();
        } else {
            open();
        }
    }, [isOpen, open, close]);

    useImperativeHandle(
        ref,
        () => ({
            open,
            close,
            toggle,
            get isOpen() {
                return isOpen.value;
            },
        }),
        [open, close, toggle, isOpen],
    );

    const pan = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .onUpdate((event) => {
            if (isOpen.value) {
                // When open, only allow swiping left (negative translation)
                const newTranslateX = Math.min(event.translationX, 0);
                translateX.value = newTranslateX;
            } else {
                // When closed, allow swiping right from the edge
                if (event.absoluteX < 40) {
                    // Edge swipe area
                    const newTranslateX = Math.max(-drawerWidth + event.translationX, -drawerWidth);
                    translateX.value = Math.min(newTranslateX, 0);
                }
            }
        })
        .onEnd((event) => {
            if (isOpen.value) {
                // If swiped left fast enough or passed threshold, close
                if (event.translationX < -drawerWidth / 3 || event.velocityX < -500) {
                    scheduleOnRN(close);
                } else {
                    scheduleOnRN(open);
                }
            } else {
                // If swiped right fast enough or passed threshold from edge, open
                if (
                    event.absoluteX < 40 + drawerWidth &&
                    (event.translationX > drawerWidth / 3 || event.velocityX > 500)
                ) {
                    scheduleOnRN(open);
                } else {
                    scheduleOnRN(close);
                }
            }
        });

    const drawerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    const backdropAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [-drawerWidth, 0],
            [0, 0.5],
            Extrapolation.CLAMP,
        );
        const zIndex = translateX.value > -drawerWidth ? 1 : -1;

        return {
            opacity,
            zIndex,
        };
    });

    const backdropAnimatedProps = useAnimatedProps(() => {
        return {
            pointerEvents: translateX.value > -drawerWidth ? "auto" : "none",
        } as any;
    });

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={pan}>
                <View style={styles.container}>
                    {/* Main Content */}
                    <View style={styles.mainContent}>{children}</View>

                    {/* Backdrop */}
                    <Animated.View
                        style={[styles.backdrop, backdropAnimatedStyle]}
                        animatedProps={backdropAnimatedProps}
                    >
                        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
                    </Animated.View>

                    {/* Drawer */}
                    <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
                        <DrawerHeader onClose={close} />
                        <DrawerPager />
                        <DrawerBottomBar />
                    </Animated.View>
                </View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
});

CognisDrawer.displayName = "CognisDrawer";

const createStyles = (theme: Theme, drawerWidth: number, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        mainContent: {
            flex: 1,
        },
        backdrop: {
            ...StyleSheet.absoluteFill,
            backgroundColor: "black",
        },
        drawer: {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: drawerWidth,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            backgroundColor: theme.background,
            shadowColor: "#000",
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 5,
            zIndex: 2,
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            overflow: "hidden",
        },
    });
