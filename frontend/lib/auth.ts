export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nyaya_token");
}

export function setToken(token: string): void {
  localStorage.setItem("nyaya_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("nyaya_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
