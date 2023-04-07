import SignIn from "components/SignIn";
import Header from "./components/Header";
import Leads from "./components/Leads";

import { UserContext } from "./context/UserContext"
import React, { useContext, useEffect, useState } from "react"
import Footer from "components/Footer";

const App = () => {
    const [token] = useContext(UserContext);
    return (
        <>
          <Header/>
          {!token ? (
            <div className="columns">
              <SignIn/>
            </div>
          ) : (
            <div className="columns">
              <Leads/>
            </div>
          )}
          <Footer/>
        </>
      );
};

export default App;

