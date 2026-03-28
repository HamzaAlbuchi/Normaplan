import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Button, Card, CardContent, Input } from "../components/ui";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitationKey, setInvitationKey] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await authApi.register(
        email,
        password,
        invitationKey.trim() || "",
        name || undefined
      );
      setAuth(token, user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-amber font-sans text-2xl font-extrabold text-white" style={{ borderRadius: 3 }}>
            BP
          </div>
          <h1 className="font-sans text-xl font-semibold text-ink">Konto erstellen</h1>
          <p className="mt-1 font-mono text-[9px] text-ink2">Bauvorschriften-Check für Architekten</p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-sm border border-border2 bg-red-soft px-4 py-3 font-mono text-sm text-red">{error}</div>
              )}
              <div>
                <Input
                  label="Einladungsschlüssel"
                  id="invitationKey"
                  type="text"
                  value={invitationKey}
                  onChange={(e) => setInvitationKey(e.target.value)}
                  placeholder="Von Administrator erhalten"
                />
                <p className="mt-1 font-mono text-[9px] text-ink2">Erforderlich, wenn Einladungsmodus aktiv ist.</p>
              </div>
              <Input
                label="Name (optional)"
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="E-Mail"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Passwort (min. 8 Zeichen)"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Wird erstellt…" : "Registrieren"}
              </Button>
            </form>
            <p className="mt-6 text-center font-sans text-sm text-ink2">
              Bereits Konto?{" "}
              <Link to="/login" className="font-medium text-amber hover:underline">
                Anmelden
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
