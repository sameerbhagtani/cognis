import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import PagerView from "react-native-pager-view";

import { DrawerTabs } from "./DrawerTabs";
import { FileTree } from "./FileTree";
import { AiChat } from "./AiChat";

export const DrawerPager = () => {
    const pagerRef = useRef<PagerView>(null);
    const [currentPage, setCurrentPage] = useState(0);

    const handleTabPress = (index: number) => {
        pagerRef.current?.setPage(index);
    };

    return (
        <View style={styles.container}>
            <DrawerTabs activeTab={currentPage} onTabPress={handleTabPress} />
            <PagerView
                ref={pagerRef}
                style={styles.pagerView}
                initialPage={0}
                onPageSelected={(e) => {
                    setCurrentPage(e.nativeEvent.position);
                }}
            >
                <View key="0" style={styles.page}>
                    <FileTree />
                </View>
                <View key="1" style={styles.page}>
                    <AiChat />
                </View>
            </PagerView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 8,
    },
    pagerView: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
});
