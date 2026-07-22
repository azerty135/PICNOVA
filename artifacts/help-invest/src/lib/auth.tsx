import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, refetch, isError } = useGetMe({
    query: {
      retry: false,
    }
  });

  useEffect(() => {
    const isPublicPage = location === "/" || location.startsWith("/register");
    if (!isLoading && isError && !isPublicPage) {
      setLocation("/");
    }
    if (!isLoading && !isError && user && isPublicPage) {
      setLocation("/dashboard");
    }
  }, [isLoading, isError, location, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a192f] flex flex-col items-center justify-center gap-4 dark">
        <h1 className="text-4xl font-serif font-bold text-[#d4af37] tracking-widest">PICNOVA</h1>
        <div className="w-8 h-8 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin mt-2" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user && !isError,
        refreshUser: () => refetch(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
