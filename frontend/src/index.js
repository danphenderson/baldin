import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ThemeProvider from './ThemeProvider'

import { UserProvider } from './context/UserContext'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <ThemeProvider>
        <UserProvider>
            <App />
        </UserProvider>
    </ThemeProvider>
)
