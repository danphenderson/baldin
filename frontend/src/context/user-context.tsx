import React, { useState, useEffect, createContext, ReactNode } from "react";
import { components } from '../schema.d';

type UserRead = components['schemas']['UserRead'];

type UserContextValue = {
  user: UserRead | null;
  setUser: React.Dispatch<React.SetStateAction<UserRead | null>>;
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
};

export const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
  token: null,
  setToken: () => {},
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserRead | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("baldin_token"));


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

      if (response.ok) {
        const userData: UserRead = await response.json();
        setUser(userData); // Set user data in state
      } else {
        setToken(null);
        setUser(null);
      }
      localStorage.setItem("baldin_token", token);
    };

    fetchUser();
  }, [token]);
  const contextValue = { user, setUser, token, setToken };

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};
