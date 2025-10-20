// Application routes

import { createBrowserRouter } from 'react-router-dom';
import { ConnectPage } from '../pages/ConnectPage';
import { ExplorerPage } from '../pages/ExplorerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ConnectPage />,
  },
  {
    path: '/explorer',
    element: <ExplorerPage />,
  },
]);
