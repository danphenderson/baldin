import React, { useState, useEffect, createContext } from "react";
import { getUser } from "../service/users"; // Import the getUser function
import { components } from '../schema.d';

type UserRead = components['schemas']['UserRead'];

type UserContextValue = {
  user: UserRead | null;
  setUser: React.Dispatch<React.SetStateAction<UserRead | null>>;
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
};

export const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
  token: null,
  setToken: () => {},
  loading: true,
});

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserRead | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("baldin_token"));
  const [loading, setLoading] = useState(!!localStorage.getItem("baldin_token"));

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        setLoading(true);
        try {
          const userData = await getUser(token);
          setUser(userData);
          localStorage.setItem("baldin_token", token); // Save token only if user data is successfully fetched
        } catch (error) {
          console.error("Failed to fetch user data", error);
          setToken(null);
          setUser(null);
          localStorage.removeItem("baldin_token"); // Clear token on failure
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const contextValue = { user, setUser, token, setToken, loading };

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};

export default UserProvider;
