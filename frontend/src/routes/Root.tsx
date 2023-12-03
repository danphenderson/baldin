import React, { useContext } from "react"
import { Outlet } from "react-router-dom";


import Login from "./login";
import Home from "./home";
import Footer from "../component/footer";
import Header from "../component/header";
import Paper from '@mui/material/Paper';

import { UserContext } from "../context/user-context"

const Root = () => {
  const [token] = useContext(UserContext);
  return (
    <>
      <div>
        <Header/>
        <Paper elevation={10} sx={{ p: 2, margin: 'auto', flexGrow: 1 }}>
        {!token ? (
          <div className="columns">
            <Login/>
          </div>
        ) : (
          <div className="columns">
            <Home />
          </div>
        )}
        </Paper>
        <Footer/>
        <div id="detail">
          <Outlet />
        </div>
      </div>
    </>
  )
}


export default Root;
