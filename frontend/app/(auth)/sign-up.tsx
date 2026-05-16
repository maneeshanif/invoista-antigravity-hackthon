import React, { useState } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { useSignUp, useAuth } from '@clerk/expo';
import { useRouter, Link, type Href } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { PremiumButton } from '@/components/shared/PremiumButton';
import { GlassCard } from '@/components/shared/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SignUpScreen() {
  // Clerk Expo v3 API: useSignUp returns { signUp, errors, fetchStatus }
  const { signUp, errors: clerkErrors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const loading = fetchStatus === 'fetching';

  // Clerk v3: check signUp.status to determine which view to show
  const pendingVerification =
    signUp?.status === 'missing_requirements' &&
    signUp?.unverifiedFields?.includes('email_address') &&
    signUp?.missingFields?.length === 0;

  const onSignUpPress = async () => {
    if (!signUp) {
      setError('Authentication service is loading, please wait a moment.');
      return;
    }

    if (!emailAddress || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');

    try {
      console.log('Attempting signUp.password with:', emailAddress);
      // Clerk Expo v3 API: use signUp.password() instead of signUp.create()
      const { error: passwordError } = await signUp.password({
        emailAddress,
        password,
      });

      if (passwordError) {
        console.error('SignUp password error:', JSON.stringify(passwordError, null, 2));
        setError(passwordError.longMessage || passwordError.message || 'Sign up failed.');
        return;
      }

      console.log('SignUp password success, sending email code...');
      // Clerk Expo v3 API: use signUp.verifications.sendEmailCode()
      await signUp.verifications.sendEmailCode();
      console.log('Email verification code sent!');
      // The component will re-render with pendingVerification = true
    } catch (err: any) {
      console.error('CRITICAL SIGNUP ERROR:', JSON.stringify(err, null, 2));
      setError(err?.message || 'Sign up failed. Please try again.');
    }
  };

  const onPressVerify = async () => {
    if (!signUp) return;
    setError('');

    try {
      console.log('Verifying email code...');
      // Clerk Expo v3 API: use signUp.verifications.verifyEmailCode()
      await signUp.verifications.verifyEmailCode({ code });

      if (signUp.status === 'complete') {
        console.log('Sign up complete, finalizing...');
        // Clerk Expo v3 API: use signUp.finalize() to activate session
        await signUp.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log('Session task:', session.currentTask);
              return;
            }
            const url = decorateUrl('/');
            if (url.startsWith('http')) {
              window.location.href = url;
            } else {
              router.push(url as Href);
            }
          },
        });
      } else {
        console.error('Sign-up not complete after verification:', signUp.status);
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error('Verify error:', JSON.stringify(err, null, 2));
      setError(err?.message || 'Verification failed');
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
                {/* Show Clerk field-level errors */}
                {clerkErrors?.fields?.emailAddress && (
                  <ThemedText style={styles.error}>{clerkErrors.fields.emailAddress.message}</ThemedText>
                )}
                {clerkErrors?.fields?.password && (
                  <ThemedText style={styles.error}>{clerkErrors.fields.password.message}</ThemedText>
                )}

                {/* Required by Clerk bot protection — renders as div#clerk-captcha on web */}
                <View nativeID="clerk-captcha" />

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

                <PremiumButton
                  title="Resend Code"
                  variant="outline"
                  onPress={() => signUp?.verifications?.sendEmailCode()}
                  style={[styles.button, { marginTop: 16, borderColor: 'rgba(255,255,255,0.2)' }]}
                  textStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
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
