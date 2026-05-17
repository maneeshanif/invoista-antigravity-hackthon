import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontFamily: 'Outfit_700Bold' },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="traces/[sessionId]" options={{ title: 'Trace Detail' }} />
    </Stack>
  );
}
