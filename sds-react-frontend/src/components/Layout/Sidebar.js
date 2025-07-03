import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Science as ScienceIcon,
  Article as ArticleIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const navItems = [
  { name: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { name: 'Chemical Inventory', icon: <ScienceIcon />, path: '/chemicals' },
  { name: 'SDS Documents', icon: <ArticleIcon />, path: '/sds' },
  { name: 'Import Data', icon: <CloudUploadIcon />, path: '/import' },
  { name: 'Search', icon: <SearchIcon />, path: '/search' },
  { name: 'Settings', icon: <SettingsIcon />, path: '/settings' }
];

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          SDS Manager
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.path}
              sx={{
                '&.active': {
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main'
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth
          }
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth
          }
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
