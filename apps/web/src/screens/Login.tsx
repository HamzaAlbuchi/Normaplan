import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Button, Card, CardContent, Input } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setAuth(token, user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-amber font-sans text-2xl font-extrabold text-white" style={{ borderRadius: 3 }}>
            BP
          </div>
          <h1 className="font-sans text-xl font-semibold text-ink">Anmelden</h1>
          <p className="mt-1 font-mono text-[9px] text-ink2">Bauvorschriften-Check für Architekten</p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-sm border border-border2 bg-red-soft px-4 py-3 font-mono text-sm text-red">{error}</div>
              )}
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
                label="Passwort"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Wird angemeldet…" : "Anmelden"}
              </Button>
            </form>
            <p className="mt-6 text-center font-sans text-sm text-ink2">
              Noch kein Konto?{" "}
              <Link to="/register" className="font-medium text-amber hover:underline">
                Registrieren
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
