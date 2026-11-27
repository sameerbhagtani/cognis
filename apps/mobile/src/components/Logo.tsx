import { Image, type ImageStyle } from "expo-image";

import type { StyleProp } from "react-native";

// expo-image renders SVG natively, and Metro already bundles .svg as an asset,
// so the source file is used as-is rather than rasterised. The mark sits on a
// transparent background, so one file reads on both themes.
const LOGO = require("@/assets/images/logo.svg");

type LogoProps = {
    style?: StyleProp<ImageStyle>;
};

export default function Logo({ style }: LogoProps) {
    return <Image source={LOGO} style={style} contentFit="contain" accessibilityLabel="Cognis" />;
}
