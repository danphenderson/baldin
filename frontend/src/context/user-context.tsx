import React, { useState, useEffect, createContext, ReactNode } from "react";

// Define the context value type
type UserContextValue = [string | null, React.Dispatch<React.SetStateAction<string | null>>];

// Create the context
export const UserContext = createContext<UserContextValue>([null, () => {}]);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("danhenderson_token"));

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        return; // If token is not available, no need to make the request
      }

      const requestOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
      };

      const response = await fetch("/users/me", requestOptions);

      if (!response.ok) {
        setToken(null);
      }

      localStorage.setItem("baldin_token", token);
    };

    fetchUser();
  }, [token]);

  return <UserContext.Provider value={[token, setToken]}>{children}</UserContext.Provider>;
};
