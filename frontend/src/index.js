import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import Root from './routes/Root'
import ThemeProvider from './ThemeProvider'
import { UserProvider } from './context/UserContext'
import ErrorPage from "./pages/ErrorPage";


const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(

)

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
  },
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
