import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Contact, {
  loader as contactLoader,
} from './routes/contact';
import Root, { 
  loader as rootLoader,
  action as rootAction
} from "./routes/root";
import ThemeProvider from './ theme-provider'
import { UserProvider } from './context/user-context'
import ErrorPage from "./error-page";
import Register from './routes/register';
import Home from './routes/home';
import Login from './routes/login';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    loader: rootLoader,
    action: rootAction,
    children : [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/home",
        element: <Home />,
      },
      {
        path: "contacts/:contactId",
        element: <Contact />,
        loader: contactLoader,
      },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
  <ThemeProvider>
  <UserProvider>
    <RouterProvider router={router} />
  </UserProvider>
  </ThemeProvider>
  </React.StrictMode>
);