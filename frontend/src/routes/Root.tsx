import React, { useContext } from "react";
import { Outlet } from "react-router-dom";

import Login from "./Login";
import Home from "./Home";
import Footer from "../component/footer";
import Header from "../component/header";
import Paper from '@mui/material/Paper';

import { UserContext } from "../context/user-context";

const Root: React.FC = () => {
  const [token] = useContext(UserContext);

  return (
    <>
      <div>
        <Header title="Header Title"/>
        <Paper elevation={10} sx={{ p: 2, margin: 'auto', flexGrow: 1 }}>
          {!token ? (
            <div className="columns">
              <Login />
            </div>
          ) : (
            <div className="columns">
              <Home />
            </div>
          )}
        </Paper>
        <Footer title="Footer Title"/>
        <div id="detail">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default Root;
