import Register from "./components/Register"
import Login from "./components/Login"
import Header from "./components/Header"
import Leads from "./components/Leads"

import { UserContext } from "./context/UserContext"
import React, { useContext, useEffect, useState } from "react"

const App = () => {
    const [message, setMessage] = useState("");
    const [token] = useContext(UserContext);
  
    const getWelcomeMessage = async () => {
      const requestOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };
      const response = await fetch("/", requestOptions);
      const data = await response.json();
  
      if (!response.ok) {
        console.log("something messed up");
      } else {
        setMessage(data.message);
      }
    };
  
    useEffect(() => {
      getWelcomeMessage();
    }, []);
    return (
        <>
          <Header title={message} />
          {!token ? (
            <div className="columns">
              <Register /> <Login />
            </div>
          ) : (
            <div className="columns">
              <Leads/>
            </div>
          )}
        </>
      );
};

export default App;

