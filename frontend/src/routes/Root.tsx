import React from "react";
import { Outlet } from "react-router-dom";
import Footer from "../component/footer";
import Header from "../component/header";
import Paper from '@mui/material/Paper';

const Root: React.FC = () => {
  // Application root component that defines the overall layout.
  // The root component handles the layout of (header, footer, paper)
  // and an <Outlet> for child routes.
  return (
    <>
      <Header title="Header Title"/>
      <Paper elevation={10} sx={{ p: 2, margin: 'auto', flexGrow: 1 }}>
        <Outlet />
      </Paper>
      <Footer title="Footer Title"/>
    </>
  );
};

export default Root;
