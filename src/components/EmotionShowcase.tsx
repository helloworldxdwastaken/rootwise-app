import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Keep the same keys so existing usages continue to work
export type EmotionKey = 'mindfull_chill' | 'productive' | 'tired_low';

type EmotionShowcaseProps = {
  emotion: EmotionKey;
  label?: string;
  note?: string;
};

export function EmotionShowcase({ emotion, label, note }: EmotionShowcaseProps) {
  const getEmoji = () => {
    switch (emotion) {
      case 'productive':
        return '🚀';
      case 'tired_low':
        return '😴';
      case 'mindfull_chill':
      default:
        return '😊';
    }
  };

  const getBackground = () => {
    switch (emotion) {
      case 'productive':
        return ['#0f766e', '#22c55e'];
      case 'tired_low':
        return ['#f97316', '#ef4444'];
      case 'mindfull_chill':
      default:
        return ['#4f46e5', '#22c55e'];
    }
  };

  const [startColor, endColor] = getBackground();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.emojiContainer,
          { backgroundColor: startColor, shadowColor: endColor },
        ]}
      >
        <Text style={styles.emoji}>{getEmoji()}</Text>
      </View>
      {(label || note) && (
        <View style={styles.caption}>
          {label && <Text style={styles.label}>{label}</Text>}
          {note && <Text style={styles.note}>{note}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  emoji: {
    fontSize: 64,
  },
  caption: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  note: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
