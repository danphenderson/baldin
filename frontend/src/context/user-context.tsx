import React, { useState, useEffect, createContext, ReactNode } from "react";

// Define the type for the context value
type UserContextType = [string | null, (token: string | null) => void];

// Create the context with an initial value
export const UserContext = createContext<UserContextType>([null, () => {}]);

// Define the type for the UserProvider's props
interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem("baldin_token"));

    useEffect(() => {
        const fetchUser = async () => {
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

            if (token) {
                localStorage.setItem("baldin_token", token);
            }
        };

        fetchUser();
    }, [token]);

    return (
        <UserContext.Provider value={[token, setToken]}>
            {children}
        </UserContext.Provider>
    );
};
