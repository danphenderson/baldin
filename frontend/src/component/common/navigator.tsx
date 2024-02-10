import React from 'react';
import { useNavigate } from 'react-router-dom';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group'; // More relevant for Leads
import ApplicationIcon from '@mui/icons-material/TouchApp'; // More relevant for Applications
import DataArrayIcon from '@mui/icons-material/DataArray'; // More relevant for Data Orchestration

const menuItems = [
  { text: 'User Profile', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Job Leads', icon: <GroupIcon />, path: '/leads' },
  { text: 'Manager Hub', icon: <ApplicationIcon />, path: '/manager' },
  { text: 'Data Orchestration', icon: <DataArrayIcon />, path: '/data-orchestration' },
];

const Navigator: React.FC = () => {
  const navigate = useNavigate();

  return (
    <List>
      {menuItems.map((item, index) => (
        <ListItem button key={index} onClick={() => navigate(item.path)}>
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItem>
      ))}
    </List>
  );
};

export default Navigator;
