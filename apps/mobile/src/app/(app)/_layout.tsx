import { Drawer } from "expo-router/drawer";
import { CustomDrawerContent } from "@/modules/drawer/components/CustomDrawerContent";
import useTheme from "@/lib/theme/useTheme";

export default function Layout() {
    const { theme } = useTheme();
    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerStyle: {
                    backgroundColor: theme.background,
                },
            }}
        >
            <Drawer.Screen
                name="index" // This is the name of the page and must match the url from root
                options={{
                    drawerLabel: "Home",
                    title: "overview",
                }}
            />
        </Drawer>
    );
}
