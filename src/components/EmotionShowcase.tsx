import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const EMOTION_ASSETS = {
  mindfull_chill: require('../../assets/emotions/mindfull_chill.json'),
  productive: require('../../assets/emotions/productive.json'),
  tired_low: require('../../assets/emotions/tired_low.json'),
} as const;

export type EmotionKey = keyof typeof EMOTION_ASSETS;

type EmotionShowcaseProps = {
  emotion: EmotionKey;
  label?: string;
  note?: string;
};

export function EmotionShowcase({ emotion, label, note }: EmotionShowcaseProps) {
  const source = EMOTION_ASSETS[emotion] || EMOTION_ASSETS.mindfull_chill;

  return (
    <View style={styles.container}>
      <LottieView
        source={source}
        autoPlay
        loop
        style={styles.animation}
      />
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
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
