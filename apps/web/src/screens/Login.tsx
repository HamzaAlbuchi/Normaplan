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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="BauPilot" className="h-20 mx-auto mb-6 object-contain" />
          <h1 className="text-xl font-semibold text-slate-900">Anmelden</h1>
          <p className="mt-1 text-sm text-slate-500">Bauvorschriften-Check für Architekten</p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
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
            <p className="mt-6 text-center text-sm text-slate-500">
              Noch kein Konto?{" "}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
                Registrieren
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
