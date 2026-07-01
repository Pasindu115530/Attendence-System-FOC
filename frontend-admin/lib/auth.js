// lib/auth.js — Auth utilities for the Admin frontend

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem('user');
}

export function isAdmin(user) {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'admin' || role === 'lecturer';
}

