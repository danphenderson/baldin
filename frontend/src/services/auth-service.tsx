import {components} from '../schema.d';

export const register = async (user: components['schemas']['UserCreate']) => {
  const body = new URLSearchParams({
    username: user.email,
    password: user.password,
  })

  const response = await fetch("/auth/register", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Registration failed");
  }
}

export const login = async (email: string, password: string) => {
  const body = new URLSearchParams({
    username: email,
    password: password,
  }).toString();

  const response = await fetch("/auth/jwt/login", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: body,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Login failed");
  }

  const data = await response.json();
  return data.access_token;
}

export const logout = async () => {
  const response = await fetch("/auth/jwt/logout", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Logout failed");
  }
}

export const forgotPassword = async (email: string) => {
  const response = await fetch("/auth/forgot-password", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email}),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Request failed");
  }
}

export const resetPassword = async (token: string, password: string) => {
  const response = await fetch("/auth/reset-password", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({token, password}),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Request failed");
  }
}

export const requestVerifyToken = async (email: string) => {
  const response = await fetch("/auth/request-verify-token", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email}),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Request failed");
  }
}

export const verify = async (token: string) => {
  const response = await fetch("/auth/verify", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({token}),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || "Verification failed");
  }
}
