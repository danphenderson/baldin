import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Thin route-group wrapper for /applications/*.
 *
 * Secondary nav is rendered by AppLayout based on pathname — this layout
 * exists solely as a React Router nesting point for application sub-routes.
 */
const ApplicationsGroupLayout: React.FC = () => <Outlet />;

export default ApplicationsGroupLayout;
