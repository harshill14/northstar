import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
      <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>NorthStar</Text>
      <Text style={{ color: '#aaa', fontSize: 18, marginTop: 10 }}>App is running!</Text>
    </View>
  );
}
