import React, { useState } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { useSignUp } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { PremiumButton } from '@/components/shared/PremiumButton';
import { GlassCard } from '@/components/shared/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSignUpPress = async () => {
    console.log('SignUp Press:', { isLoaded, emailAddress, hasSignUp: !!signUp });
    if (!signUp) {
      console.log('SignUp object not ready');
      return;
    }
    setLoading(true);
    setError('');

    try {
      console.log('Attempting signUp.create with:', emailAddress);
      const response = await signUp.create({
        emailAddress,
        password,
      });

      console.log('SignUp Success Response:', response.status);

      if (response.status === 'missing_requirements') {
        console.log('Step 2: Preparing verification...');
        await signUp.prepareVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      } else if (response.status === 'complete') {
        console.log('Step 2: Sign up complete, setting active session');
        if (setActive) {
          await setActive({ session: response.createdSessionId });
        }
      }
    } catch (err: any) {
      console.error('CRITICAL SIGNUP ERROR:', err);
      const clerkError = err.errors?.[0]?.message || err.message || 'Signup failed. Please check your internet or try another browser.';
      setError(clerkError);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!signUp) return;
    setLoading(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptVerification({
        code,
        strategy: 'email_code'
      });

      if (setActive) {
        await setActive({ session: completeSignUp.createdSessionId });
      } else {
        console.error('setActive is not defined');
        setError('Verification successful, but session could not be activated. Please sign in manually.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const renderHeroContent = (isMobile: boolean) => (
    <View style={isMobile ? styles.mobileHero : styles.marketingContainer}>
      <View style={styles.logoRow}>
        <View style={styles.logoBox}>
          <IconSymbol name="house.fill" size={isMobile ? 20 : 24} color="#00E5FF" />
        </View>
        <ThemedText style={styles.logoText}>Invoista</ThemedText>
      </View>

      <View style={isMobile ? styles.mobileTextContainer : styles.marketingTextContainer}>
        <ThemedText type="title" style={isMobile ? styles.mobileHeroTitle : styles.marketingTitle}>
          Premium services at the speed of thought.
        </ThemedText>
        {!isMobile && (
          <ThemedText style={styles.marketingSubtitle}>
            Describe your problem in plain English. Invoista's AI finds the best professionals to help you instantly.
          </ThemedText>
        )}

        {!isMobile && (
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <IconSymbol name="sparkles" size={16} color="#00E5FF" />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">AI-Powered Intent Discovery</ThemedText>
                <ThemedText style={styles.featureDesc}>Just say what you need, AI finds the right expert.</ThemedText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <IconSymbol name="shield.fill" size={16} color="#00E5FF" />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">Verified Professionals</ThemedText>
                <ThemedText style={styles.featureDesc}>Every provider is vetted for quality and trust.</ThemedText>
              </View>
            </View>
          </View>
        )}
      </View>

      {!isMobile && (
        <ThemedText style={styles.copyright}>© 2026 Invoista. All rights reserved.</ThemedText>
      )}
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      {isLargeScreen && renderHeroContent(false)}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.authContainer, !isLargeScreen && { width: '100%' }]}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, !isLargeScreen && { paddingVertical: 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {!isLargeScreen && renderHeroContent(true)}

          <GlassCard style={styles.card}>
            {!pendingVerification ? (
              <>
                <ThemedText type="title" style={styles.cardTitle}>Create account</ThemedText>
                <ThemedText style={styles.cardSubtitle}>Get started with Invoista today</ThemedText>

                <View style={styles.inputContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>Email address</ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Enter your email address"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={styles.input}
                    onChangeText={(email) => setEmailAddress(email)}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>Password</ThemedText>
                  <TextInput
                    value={password}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={styles.input}
                    secureTextEntry={true}
                    onChangeText={(password) => setPassword(password)}
                  />
                </View>

                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

                <PremiumButton
                  title={loading ? "Creating account..." : "Continue"}
                  onPress={onSignUpPress}
                  style={styles.button}
                />

                <View style={styles.footer}>
                  <ThemedText style={styles.footerText}>Already have an account? </ThemedText>
                  <Link href="/(auth)/sign-in" asChild>
                    <ThemedText type="link" style={styles.signUpLink}>Sign In</ThemedText>
                  </Link>
                </View>

                <PremiumButton
                  title="Explore as Guest"
                  variant="outline"
                  onPress={() => router.replace('/(tabs)')}
                  style={[styles.button, { marginTop: 16, borderColor: 'rgba(255,255,255,0.2)' }]}
                  textStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
              </>
            ) : (
              <>
                <ThemedText type="title" style={styles.cardTitle}>Verify email</ThemedText>
                <ThemedText style={styles.cardSubtitle}>Enter the code sent to your email</ThemedText>

                <View style={styles.inputContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>Verification Code</ThemedText>
                  <TextInput
                    value={code}
                    placeholder="Enter the 6-digit code"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={styles.input}
                    keyboardType="numeric"
                    onChangeText={(code) => setCode(code)}
                  />
                </View>

                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

                <PremiumButton
                  title={loading ? "Verifying..." : "Verify Email"}
                  onPress={onPressVerify}
                  style={styles.button}
                />

                <TouchableOpacity 
                  onPress={() => setPendingVerification(false)} 
                  style={{ marginTop: 16, alignItems: 'center' }}
                >
                  <ThemedText style={styles.footerText}>Back to Sign Up</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
          
          {!isLargeScreen && (
             <ThemedText style={[styles.copyright, { marginTop: 40, textAlign: 'center' }]}>
               © 2026 Invoista. All rights reserved.
             </ThemedText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.dark.background,
  },
  marketingContainer: {
    flex: 1,
    backgroundColor: '#0F1115',
    padding: 60,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  mobileHero: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logoBox: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  logoText: {
    fontFamily: Typography.fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mobileTextContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mobileHeroTitle: {
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: Typography.fonts.bold,
  },
  marketingTextContainer: {
    maxWidth: 480,
  },
  marketingTitle: {
    fontSize: 48,
    lineHeight: 56,
    marginBottom: 24,
    color: '#FFFFFF',
  },
  marketingSubtitle: {
    fontSize: 18,
    lineHeight: 28,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 48,
  },
  featureList: {
    gap: 32,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 16,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  copyright: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Typography.fonts.bold,
  },
  cardSubtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: Typography.fonts.medium,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontFamily: Typography.fonts.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    height: 54,
  },
  error: {
    color: '#FF4B4B',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  signUpLink: {
    color: '#00E5FF',
    fontFamily: Typography.fonts.medium,
  },
});
