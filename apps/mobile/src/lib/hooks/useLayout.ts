import { useWindowDimensions } from "react-native";

/**
 * How wide a column of body text is allowed to get. Past roughly this the eye
 * loses its place tracking back to the start of the next line, which is what a
 * landscape phone or a tablet hands you if nothing caps it.
 *
 * Deliberately larger than the auth cards' 400/500: those are short forms that
 * look adrift when stretched, whereas notes and chat are continuous prose and
 * read as cramped if held that narrow.
 */
export const CONTENT_MAX_WIDTH = 720;

export type Layout = {
    width: number;
    height: number;
    isLandscape: boolean;
};

/**
 * The single source for orientation in the app. Written out separately in seven
 * screens before this existed, which is how the phase 4-6 screens ended up with
 * no orientation handling at all - there was nothing to import.
 *
 * `useWindowDimensions` rather than `Dimensions.get`: it re-renders on rotation,
 * and on Android it also tracks the window shrinking in split-screen.
 */
export function useLayout(): Layout {
    const { width, height } = useWindowDimensions();

    return { width, height, isLandscape: width > height };
}
