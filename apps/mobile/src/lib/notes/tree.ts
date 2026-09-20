import type { Folder, Note } from "@/modules/note/types";

export type TreeFolder = {
    kind: "folder";
    id: string;
    name: string;
    parentFolderId: string | null;
    children: TreeNode[];
};

export type TreeNote = {
    kind: "note";
    id: string;
    title: string;
    folderId: string | null;
};

export type TreeNode = TreeFolder | TreeNote;

function byLabel(a: TreeNode, b: TreeNode): number {
    const left = a.kind === "folder" ? a.name : a.title;
    const right = b.kind === "folder" ? b.name : b.title;

    // Folders above notes, then alphabetical - the order the API already sorts
    // each list in, preserved once they're interleaved.
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;

    return left.localeCompare(right);
}

/**
 * Builds the whole workspace tree from one flat folder list and one flat note
 * list, rather than fetching per expanded node - a tree this size is cheaper to
 * assemble locally than to walk over the network, and expanding stays instant.
 *
 * A folder whose parent isn't in the list is treated as a root: that shouldn't
 * happen (the API only returns live rows, and phase 1's restore rules prevent a
 * live row under a trashed parent), but dropping it would hide real notes.
 */
export function buildTree(folders: Folder[], notes: Note[]): TreeNode[] {
    const nodes = new Map<string, TreeFolder>(
        folders.map((folder) => [
            folder.id,
            {
                kind: "folder",
                id: folder.id,
                name: folder.name,
                parentFolderId: folder.parentFolderId,
                children: [],
            },
        ]),
    );

    const roots: TreeNode[] = [];

    for (const folder of nodes.values()) {
        const parent = folder.parentFolderId ? nodes.get(folder.parentFolderId) : undefined;

        if (parent) parent.children.push(folder);
        else roots.push(folder);
    }

    for (const note of notes) {
        const leaf: TreeNote = {
            kind: "note",
            id: note.id,
            title: note.title,
            folderId: note.folderId,
        };

        const parent = note.folderId ? nodes.get(note.folderId) : undefined;

        if (parent) parent.children.push(leaf);
        else roots.push(leaf);
    }

    for (const folder of nodes.values()) folder.children.sort(byLabel);
    roots.sort(byLabel);

    return roots;
}

/** Every folder, flattened with its depth - what the "move to" picker lists. */
export function flattenFolders(
    tree: TreeNode[],
    depth = 0,
): { folder: TreeFolder; depth: number }[] {
    return tree.flatMap((node) =>
        node.kind === "folder"
            ? [{ folder: node, depth }, ...flattenFolders(node.children, depth + 1)]
            : [],
    );
}

/** A folder can't move into itself or its own descendants - the API rejects it. */
export function collectSubtreeIds(folder: TreeFolder): Set<string> {
    const ids = new Set<string>([folder.id]);

    for (const child of folder.children) {
        if (child.kind !== "folder") continue;

        for (const id of collectSubtreeIds(child)) ids.add(id);
    }

    return ids;
}
