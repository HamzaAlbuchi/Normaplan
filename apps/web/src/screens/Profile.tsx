import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/client";
import { useAuthStore } from "../store/auth";

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
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-slate-800">Profil & Einstellungen</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">Kontoinformationen</h2>
        <p className="text-sm text-slate-600 mb-4">E-Mail: {profile.email}</p>
        <form onSubmit={handleSaveProfile} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={nameEdit || profile.name || ""}
              onChange={(e) => setNameEdit(e.target.value)}
              placeholder="Ihr Name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {updateProfileMutation.isPending ? "Speichern…" : "Speichern"}
          </button>
        </form>
        {profileMessage && (
          <p className={`mt-3 text-sm ${profileMessage.startsWith("Profil") ? "text-green-600" : "text-red-600"}`}>
            {profileMessage}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">Passwort ändern</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1">
              Aktuelles Passwort
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">
              Neues Passwort (min. 8 Zeichen)
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </div>
          <div>
            <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-slate-700 mb-1">
              Neues Passwort wiederholen
            </label>
            <input
              id="newPasswordConfirm"
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {changePasswordMutation.isPending ? "Ändern…" : "Passwort ändern"}
          </button>
        </form>
        {passwordMessage && (
          <p className={`mt-3 text-sm ${passwordMessage.includes("geändert") ? "text-green-600" : "text-red-600"}`}>
            {passwordMessage}
          </p>
        )}
      </section>
    </div>
  );
}
