// Main application component

import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ToastContainer } from '../modules/ui/Toast';
import { useMqttClient } from '../modules/mqtt/useMqttClient';
import { createContext, useContext } from 'react';

// Create context for MQTT client functions
export const MqttClientContext = createContext<ReturnType<typeof useMqttClient> | null>(null);

export function useMqttClientContext() {
  const context = useContext(MqttClientContext);
  if (!context) {
    throw new Error('useMqttClientContext must be used within MqttClientContext.Provider');
  }
  return context;
}

export function App() {
  // Initialize MQTT client at app level so it persists across page navigation
  const mqttClient = useMqttClient();

  return (
    <MqttClientContext.Provider value={mqttClient}>
      <RouterProvider router={router} />
      <ToastContainer />
    </MqttClientContext.Provider>
  );
}
