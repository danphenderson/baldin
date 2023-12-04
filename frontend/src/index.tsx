import React, { useContext, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Route, Navigate } from "react-router-dom";
import ReactDOM from 'react-dom/client';

// Import error-page roots, theme, and user-context
// Components are NOT imported here.
import Root from "./routes/root";
import ThemeProvider from './theme-provider';
import { UserProvider, UserContext } from './context/user-context';
import ErrorPage from "./error-page";
import Register from './routes/register';
import Home from './routes/home';
import Login from './routes/login';

const AuthHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token] = useContext(UserContext);

  useEffect(() => {
    // Here you can also implement additional logic if needed,
    // like fetching user details or redirecting based on user roles
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "home",
        element: (
          <AuthHandler>
            <Home />
          </AuthHandler>
        ),
      }
    ]
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <RouterProvider router={router} />
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>
);
