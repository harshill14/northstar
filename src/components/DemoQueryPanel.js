/**
 * DemoQueryPanel - Quick-tap buttons for demo mode.
 * Since speech recognition requires a real device, these buttons let you
 * simulate voice queries during a 3-minute demo.
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOrchestrator } from '../services/AgentOrchestrator';

const DEMO_QUERIES = [
  { icon: 'glasses-outline', label: 'Find Glasses', query: 'Where are my glasses?' },
  { icon: 'key-outline', label: 'Find Keys', query: 'Where are my keys?' },
  { icon: 'person-outline', label: 'Who Is This?', query: 'Who is this person?' },
  { icon: 'medkit-outline', label: 'Medication', query: 'Did I take my medicine?' },
  { icon: 'flame-outline', label: 'Stove Safe?', query: 'Is the stove on?' },
  { icon: 'phone-portrait-outline', label: 'Find Phone', query: 'Where is my phone?' },
];

export default function DemoQueryPanel() {
  const { handleUserQuery } = useOrchestrator();

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Tap a question to demo:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {DEMO_QUERIES.map((item) => (
          <TouchableOpacity
            key={item.query}
            style={styles.queryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleUserQuery(item.query);
            }}
            accessibilityLabel={item.label}
          >
            <Ionicons name={item.icon} size={20} color="#fff" />
            <Text style={styles.queryText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    alignItems: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 8,
  },
  scroll: {
    maxHeight: 50,
  },
  queryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    gap: 6,
  },
  queryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
