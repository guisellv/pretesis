import { useState } from "react";
import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../hooks/useAuth";
import { EmptyPanelPage } from "./EmptyPanelPage";

export function AuthPage() {
    const { user } = useAuth();
    const [mode, setMode] = useState<"login" | "registro">("login");

    if (user) {
        return <EmptyPanelPage />;
    }

    return (
        <main>
            <h1>Agenda Comunitaria</h1>
            <AuthForm mode={mode} onModeChange={setMode} />
        </main>
    );
}
