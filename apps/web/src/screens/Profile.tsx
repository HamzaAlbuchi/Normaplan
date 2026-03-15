import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Button, Card, CardHeader, CardContent, Input, PageHeader } from "../components/ui";

export default function Profile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  const [nameEdit, setNameEdit] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.getMe(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (name: string) => authApi.updateProfile({ name }),
    onSuccess: (data) => {
      setUser(data);
      setNameEdit("");
      setProfileMessage("Profil gespeichert.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => setProfileMessage(err instanceof Error ? err.message : "Fehler"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordMessage("Passwort wurde geändert.");
    },
    onError: (err) => setPasswordMessage(err instanceof Error ? err.message : "Fehler"),
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage("");
    const name = nameEdit.trim();
    if (name.length === 0) return;
    updateProfileMutation.mutate(name);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    if (newPassword !== newPasswordConfirm) {
      setPasswordMessage("Neues Passwort und Wiederholung stimmen nicht überein.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage("Neues Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    changePasswordMutation.mutate();
  };

  if (isLoading || !profile) {
    return <p className="text-slate-500">Lade Profil…</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        title="Profil & Einstellungen"
        description="Kontodaten und Passwort verwalten."
      />

      <Card>
        <CardHeader title="Kontoinformationen" description={`E-Mail: ${profile.email}`} />
        <CardContent>
          <form onSubmit={handleSaveProfile} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Name (optional)"
                id="name"
                type="text"
                value={nameEdit || profile.name || ""}
                onChange={(e) => setNameEdit(e.target.value)}
                placeholder="Ihr Name"
              />
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Speichern…" : "Speichern"}
            </Button>
          </form>
          {profileMessage && (
            <p className={`mt-3 text-sm ${profileMessage.startsWith("Profil") ? "text-emerald-600" : "text-red-600"}`}>
              {profileMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Passwort ändern" />
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Aktuelles Passwort"
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Neues Passwort (min. 8 Zeichen)"
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <Input
              label="Neues Passwort wiederholen"
              id="newPasswordConfirm"
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
            />
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? "Ändern…" : "Passwort ändern"}
            </Button>
          </form>
          {passwordMessage && (
            <p className={`mt-3 text-sm ${passwordMessage.includes("geändert") ? "text-emerald-600" : "text-red-600"}`}>
              {passwordMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
