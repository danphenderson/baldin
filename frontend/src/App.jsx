import AddIcon from '@mui/icons-material/Add'
import GitHubIcon from '@mui/icons-material/GitHub'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Register from "./components/Register"
import Login from "./components/Login"
import Header from "./components/Header"
import Table from "./components/Table"
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
          <div className="columns">
            <div className="column"></div>
            <div className="column m-5 is-two-thirds">
              {!token ? (
                <div className="columns">
                  <Register /> <Login />
                </div>
              ) : (
                <Table />
              )}
            </div>
            <div className="column"></div>
          </div>
        </>
      );
};

export default App;

