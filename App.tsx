import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function App() {
  const [screen, setScreen] = React.useState('welcome');

  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#fdf8f3', '#f5f0e8', '#eef3ec']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🌿</Text>
            </View>
            
            <Text style={styles.title}>Rootwise</Text>
            <Text style={styles.subtitle}>
              Your AI-powered wellness companion
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => setScreen('login')}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setScreen('register')}
              >
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.features}>
              <Feature icon="💬" text="AI Health Chat" />
              <Feature icon="📊" text="Track Daily Wellness" />
              <Feature icon="🎯" text="Personalized Insights" />
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#fdf8f3', '#f5f0e8']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen('welcome')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.input}>
                <Text style={styles.placeholder}>your@email.com</Text>
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.input}>
                <Text style={styles.placeholder}>••••••••</Text>
              </View>

              <TouchableOpacity style={[styles.button, styles.primaryButton, { marginTop: 24 }]}>
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>

              <Text style={styles.note}>
                Coming soon: Full authentication integration with Rootwise backend
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (screen === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#fdf8f3', '#f5f0e8']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen('welcome')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Get Started</Text>
            <Text style={styles.subtitle}>Create your account</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.input}>
                <Text style={styles.placeholder}>Your name</Text>
              </View>

              <Text style={styles.label}>Email</Text>
              <View style={styles.input}>
                <Text style={styles.placeholder}>your@email.com</Text>
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.input}>
                <Text style={styles.placeholder}>••••••••</Text>
              </View>

              <TouchableOpacity style={[styles.button, styles.primaryButton, { marginTop: 24 }]}>
                <Text style={styles.primaryButtonText}>Create Account</Text>
              </TouchableOpacity>

              <Text style={styles.note}>
                Coming soon: Full authentication integration with Rootwise backend
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return null;
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#A6C7A3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2d3a2e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7a6f',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 48,
  },
  button: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#A6C7A3',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#A6C7A3',
  },
  secondaryButtonText: {
    color: '#A6C7A3',
    fontSize: 18,
    fontWeight: '600',
  },
  features: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#2d3a2e',
    fontWeight: '500',
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#A6C7A3',
    fontWeight: '600',
  },
  form: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3a2e',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e5e0',
  },
  placeholder: {
    color: '#9ca69f',
    fontSize: 16,
  },
  note: {
    marginTop: 24,
    textAlign: 'center',
    color: '#6b7a6f',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
