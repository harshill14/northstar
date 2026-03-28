import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OrchestratorProvider } from './src/services/AgentOrchestrator';
import MainView from './src/components/MainView';

export default function App() {
  return (
    <SafeAreaProvider>
      <OrchestratorProvider>
        <StatusBar style="light" />
        <MainView />
      </OrchestratorProvider>
    </SafeAreaProvider>
  );
}
