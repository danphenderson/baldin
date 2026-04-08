import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Thin route-group wrapper for /network/*.
 *
 * Secondary nav is rendered by AppLayout based on pathname — this layout
 * exists solely as a React Router nesting point for network sub-routes.
 */
const NetworkGroupLayout: React.FC = () => <Outlet />;

export default NetworkGroupLayout;
