const API_URL = "http://localhost:3001";

export async function getNonce(address) {
  const res = await fetch(`${API_URL}/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
    credentials: "include",
  });
  return await res.json();
}

export async function verifyLogin(data) {
  const res = await fetch(`${API_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server responded with ${res.status}: ${text}`);
  }

  return await res.json();
}


export async function getMe() {
  const res = await fetch(`${API_URL}/me`, {
    method: "GET",
    credentials: "include",
  });
  return await res.json();
}

export async function logout() {
  const res = await fetch(`${API_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
  return await res.json();
}
