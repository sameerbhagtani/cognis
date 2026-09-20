import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

interface TreeNode {
    id: string;
    name: string;
    type: "folder" | "file";
    children?: TreeNode[];
}

const DUMMY_DATA: TreeNode[] = [
    {
        id: "1",
        name: "Workspace",
        type: "folder",
        children: [
            {
                id: "2",
                name: "Notes",
                type: "folder",
                children: [
                    { id: "3", name: "Project Ideas.md", type: "file" },
                    { id: "4", name: "Meeting Notes.md", type: "file" },
                ],
            },
            {
                id: "5",
                name: "Documents",
                type: "folder",
                children: [{ id: "6", name: "Requirements.pdf", type: "file" }],
            },
            { id: "7", name: "Readme.md", type: "file" },
        ],
    },
];

export const FileTree = () => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        "1": true,
        "2": true,
    });

    const toggleFolder = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderNode = (node: TreeNode, depth: number) => {
        const isExpanded = expanded[node.id];
        const isFolder = node.type === "folder";

        return (
            <View key={node.id}>
                <Pressable
                    style={[styles.node, { paddingLeft: 16 + depth * 16 }]}
                    onPress={() => isFolder && toggleFolder(node.id)}
                >
                    {isFolder && <Text style={styles.icon}>{isExpanded ? "▾" : "▸"}</Text>}
                    {!isFolder && <Text style={styles.icon}>📄</Text>}
                    <Text style={styles.nodeText}>{node.name}</Text>
                </Pressable>
                {isFolder && isExpanded && node.children && (
                    <View>{node.children.map((child) => renderNode(child, depth + 1))}</View>
                )}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {DUMMY_DATA.map((node) => renderNode(node, 0))}
        </ScrollView>
    );
};

const createStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        content: {
            paddingVertical: 8,
        },
        node: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            paddingRight: 16,
        },
        icon: {
            width: 20,
            fontSize: 14,
            color: theme.foreground,
            textAlign: "center",
            marginRight: 4,
        },
        nodeText: {
            fontSize: 15,
            color: theme.foreground,
        },
    });
