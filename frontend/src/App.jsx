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
    // return (
    // <>
    //   <Box sx={{ flexGrow: 1 }}>
    //     <AppBar position="static">
    //       <Toolbar>
    //         <Typography variant="h6" sx={{ flexGrow: 1 }}>
    //           Baldin
    //         </Typography>
    //         <IconButton
    //           size="large"
    //           edge="end"
    //           color="inherit"
    //           onClick={() => window.open('https://github.com/danphenderson/baldin', '_blank')}
    //         >
    //           <GitHubIcon />
    //         </IconButton>
    //       </Toolbar>
    //     </AppBar>
    //   </Box>
    //   <Box sx={{ p: 3 }}>
    //     <Typography variant="h1">h1. Heading</Typography>
    //     <Typography variant="h2">h2. Heading</Typography>
    //     <Typography variant="h3">h3. Heading</Typography>
    //     <Typography variant="h4">h4. Heading</Typography>
    //     <Typography variant="h5">h5. Heading</Typography>
    //     <Typography variant="h6">h6. Heading</Typography>
    //     <Typography variant="body1">body1. text</Typography>
    //     <Typography variant="body2">body2. text</Typography>
    //   </Box>
    //   <Fab
    //     color="secondary"
    //     sx={{
    //       position: 'fixed',
    //       right: ({ spacing }) => spacing(3),
    //       bottom: ({ spacing }) => spacing(3),
    //     }}
    //   >
    //     <AddIcon />
    //   </Fab>
    // </>
    // );
};

export default App;

