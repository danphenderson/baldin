// look into react context hooks for technical details

import React from "react";

// declare components
export const UserContext = React.createContext();

export const UserProvider = (props) => {
    const [token, setToken] = React.useState(localStorage.getItem("baldin_token"))
    React.useEffect( () => {
        const fetchUser = async () => {
            const requestOptions = {
                method : "GET",
                headers: {
                    "Conent-Type" : "application/json",
                    "Authorization": "Bearer " + token
            },
        };

        const response = await fetch("/users/me", requestOptions);

        if (!response.ok) {
            setToken(null);
            
        };
        localStorage.setItem("baldin_token", token);

    };
    fetchUser();
    }, [token]);
    return (
        <UserContext.Provider value={[token, setToken]}>{props.children}</UserContext.Provider>
    )
};
