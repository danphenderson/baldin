import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Thin route-group wrapper for /leads/*.
 *
 * Secondary nav is rendered by AppLayout based on pathname — this layout
 * exists solely as a React Router nesting point for leads sub-routes.
 */
const LeadsGroupLayout: React.FC = () => <Outlet />;

export default LeadsGroupLayout;
