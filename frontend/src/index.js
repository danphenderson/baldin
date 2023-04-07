import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import Root from './routes/Root'
import ThemeProvider from './ThemeProvider'
import { UserProvider } from './context/UserContext'
import ErrorPage from "./ErrorPage";
import Register from './routes/Register';
import Home from './routes/Home';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/home",
    element: <Home />,
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
