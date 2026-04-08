import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Thin route-group wrapper for /me/*.
 *
 * Secondary nav is rendered by AppLayout based on pathname — this layout
 * exists solely as a React Router nesting point for identity sub-routes.
 */
const IdentityGroupLayout: React.FC = () => <Outlet />;

export default IdentityGroupLayout;
