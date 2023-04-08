import React, { useContext } from "react"
import { Outlet } from "react-router-dom";


import { getContacts, createContact } from "../contacts";
import Login from "./login";
import Home from "./home";
import Footer from "../components/footer";
import Header from "../components/header";

import { UserContext } from "../context/user-context"

export async function loader() {
  const contacts = await getContacts();
  return { contacts };
}
export async function action() {
  const contact = await createContact();
  return { contact };
}

const Root = () => {
  const [token] = useContext(UserContext);
  return (
    <>
      <div>
        <Header/>
        {!token ? (
          <div className="columns">
            <Login/>
          </div>
        ) : (
          <div className="columns">
            <Home />
          </div>
        )}
        <Footer/>
        <div id="detail">
          <Outlet />
        </div>
      </div>
    </>
  )
}


export default Root;