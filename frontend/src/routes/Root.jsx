import SignIn from "../components/SignIn";
import Leads from "../components/Leads";
import { UserContext } from "../context/UserContext"
import React, { useContext } from "react"
import Footer from "../components/Footer";
import Header from "../components/Header";


const Root = () => {
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
  )
}


export default Root;