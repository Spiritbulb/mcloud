// Home / sign-in — native magic-code auth (no browser). Two steps: enter email →
// enter the 6-digit code emailed by WorkOS. One flow covers sign-in AND sign-up,
// so a brand-new user just enters their email and the code. Expressive Material 3,
// follows system light/dark.
import * as React from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthContext'
import { Button, FadeInUp, MarketingImage } from '@/components/ui'
import { useTheme } from '@/lib/theme'
import { config } from '@/lib/config'

type Step = 'email' | 'code'

export default function Home() {
  const t = useTheme()
  const { user, loading, sendCode, verifyCode, verifyPassword } = useAuth()

  const [step, setStep] = React.useState<Step>('email')
  const [email, setEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // The app-store review account signs in by password (reviewers can't get the
  // emailed code). Reveal the password field only when its exact email is typed;
  // config.reviewEmail is empty for normal builds, so this never shows.
  const isReviewEmail =
    config.reviewEmail !== '' &&
    email.trim().toLowerCase() === config.reviewEmail

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const codeValid = code.trim().length >= 6

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.fill,
          styles.center,
          { backgroundColor: t.colors.background },
        ]}
      >
        <ActivityIndicator color={t.colors.primary} size="large" />
        <Text
          style={[
            styles.loadingText,
            { color: t.colors.onSurfaceVariant },
          ]}
        >
          Getting things ready…
        </Text>
      </SafeAreaView>
    )
  }

  // Keep the existing typed route used by the app.
  if (user) return <Redirect href="/orgs" />

  const onSendCode = async () => {
    if (!emailValid || busy) return

    setError(null)
    setBusy(true)

    try {
      await sendCode(email.trim())
      setStep('code')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'We could not send the code. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onVerify = async () => {
    if (!codeValid || busy) return

    setError(null)
    setBusy(true)

    try {
      await verifyCode(email.trim(), code.trim())
      // On success the auth state flips to a user and the Redirect above fires.
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'That code is not valid or has expired. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onPasswordSignIn = async () => {
    if (!password || busy) return

    setError(null)
    setBusy(true)

    try {
      await verifyPassword(email.trim(), password)
      // On success the auth state flips to a user and the Redirect above fires.
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Your email or password is incorrect.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onChangeEmail = () => {
    if (busy) return

    setStep('email')
    setCode('')
    setPassword('')
    setError(null)
  }

  const onEmailChange = (value: string) => {
    setEmail(value)
    if (error) setError(null)
  }

  const onCodeChange = (value: string) => {
    setCode(value.replace(/[^0-9]/g, '').slice(0, 6))
    if (error) setError(null)
  }

  const onPasswordChange = (value: string) => {
    setPassword(value)
    if (error) setError(null)
  }

  const heading =
    step === 'email' ? 'Your business, in your hands.' : 'Check your email'

  const supportingCopy =
    step === 'email'
      ? 'Enter your email address to sign in. If you are new, we will create your account after you confirm your code.'
      : `We have sent a 6-digit code to ${email.trim()}. Enter it below to continue.`

  return (
  <SafeAreaView
    style={[styles.fill, { backgroundColor: t.colors.background }]}
  >
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text
            accessibilityRole="header"
            style={[styles.brand, { color: t.colors.primary }]}
          >
            MENENGAI CLOUD
          </Text>

          <Text
            style={[
              styles.stepIndicator,
              {
                color: t.colors.onSurfaceVariant,
                backgroundColor: t.colors.surfaceVariant,
              },
            ]}
          >
            {step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}
          </Text>
        </View>

        <View style={styles.content}>
          <FadeInUp delay={0}>
            <View
              style={[
                styles.illoPanel,
                { backgroundColor: t.colors.primaryContainer },
              ]}
            >
              <MarketingImage
                name="marketing-make-it-yours.png"
                width={220}
                height={180}
              />
            </View>
          </FadeInUp>

          <FadeInUp delay={80}>
            <View style={styles.copy}>
              <Text
                accessibilityRole="header"
                style={[styles.heading, { color: t.colors.onSurface }]}
              >
                {heading}
              </Text>

              <Text
                style={[
                  styles.supportingCopy,
                  { color: t.colors.onSurfaceVariant },
                ]}
              >
                {supportingCopy}
              </Text>
            </View>
          </FadeInUp>

          <FadeInUp delay={160}>
            <View style={styles.form}>
                {error && (
                  <View
                    accessibilityRole="alert"
                    style={[
                      styles.errorCard,
                      {
                        backgroundColor: t.colors.errorContainer,
                        borderColor: t.colors.error,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.errorTitle,
                        { color: t.colors.onErrorContainer },
                      ]}
                    >
                      Something went wrong
                    </Text>

                    <Text
                      style={[
                        styles.errorText,
                        { color: t.colors.onErrorContainer },
                      ]}
                    >
                      {error}
                    </Text>
                  </View>
                )}

                {step === 'email' ? (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text
                        style={[
                          styles.label,
                          { color: t.colors.onSurface },
                        ]}
                      >
                        Email address
                      </Text>

                      <TextInput
                        value={email}
                        onChangeText={onEmailChange}
                        placeholder="you@example.com"
                        placeholderTextColor={t.colors.onSurfaceVariant}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        keyboardType="email-address"
                        inputMode="email"
                        textContentType="emailAddress"
                        returnKeyType={isReviewEmail ? 'next' : 'go'}
                        editable={!busy}
                        onSubmitEditing={() => {
                          if (!isReviewEmail) onSendCode()
                        }}
                        accessibilityLabel="Email address"
                        accessibilityHint="Enter the email address you use for Menengai Cloud"
                        style={[
                          styles.input,
                          {
                            backgroundColor: t.colors.surfaceVariant,
                            color: t.colors.onSurface,
                            borderColor: t.colors.outline,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.helperText,
                          { color: t.colors.onSurfaceVariant },
                        ]}
                      >
                        We will send a secure sign-in code to this address.
                      </Text>
                    </View>

                    {isReviewEmail ? (
                      <>
                        <View style={styles.fieldGroup}>
                          <Text
                            style={[
                              styles.label,
                              { color: t.colors.onSurface },
                            ]}
                          >
                            Password
                          </Text>

                          <TextInput
                            value={password}
                            onChangeText={onPasswordChange}
                            placeholder="Enter your password"
                            placeholderTextColor={t.colors.onSurfaceVariant}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="current-password"
                            secureTextEntry
                            textContentType="password"
                            returnKeyType="go"
                            editable={!busy}
                            onSubmitEditing={onPasswordSignIn}
                            accessibilityLabel="Password"
                            style={[
                              styles.input,
                              {
                                backgroundColor: t.colors.surfaceVariant,
                                color: t.colors.onSurface,
                                borderColor: t.colors.outline,
                              },
                            ]}
                          />
                        </View>

                        <Button
                          label="Sign in"
                          onPress={onPasswordSignIn}
                          loading={busy}
                          disabled={password.length === 0}
                          variant="filled"
                        />
                      </>
                    ) : (
                      <Button
                        label="Send me a code"
                        onPress={onSendCode}
                        loading={busy}
                        disabled={!emailValid}
                        variant="filled"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text
                        style={[
                          styles.label,
                          { color: t.colors.onSurface },
                        ]}
                      >
                        6-digit sign-in code
                      </Text>

                      <TextInput
                        value={code}
                        onChangeText={onCodeChange}
                        placeholder="123456"
                        placeholderTextColor={t.colors.onSurfaceVariant}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                        returnKeyType="go"
                        editable={!busy}
                        autoFocus
                        maxLength={6}
                        onSubmitEditing={onVerify}
                        accessibilityLabel="6-digit sign-in code"
                        accessibilityHint="Enter the six digit code sent to your email"
                        style={[
                          styles.input,
                          styles.codeInput,
                          {
                            backgroundColor: t.colors.surfaceVariant,
                            color: t.colors.onSurface,
                            borderColor: t.colors.outline,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.helperText,
                          { color: t.colors.onSurfaceVariant },
                        ]}
                      >
                        The code may take a minute to arrive. Check your spam folder too.
                      </Text>
                    </View>

                    <Button
                      label="Sign in"
                      onPress={onVerify}
                      loading={busy}
                      disabled={!codeValid}
                      variant="filled"
                    />

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Use a different email address"
                      disabled={busy}
                      onPress={onChangeEmail}
                      style={({ pressed }) => [
                        styles.secondaryAction,
                        pressed && !busy && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryActionText,
                          {
                            color: busy
                              ? t.colors.onSurfaceVariant
                              : t.colors.primary,
                          },
                        ]}
                      >
                        Use a different email
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
          </FadeInUp>
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: t.colors.onSurfaceVariant },
            ]}
          >
            Secure access for your Menengai Cloud business.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
)
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 14,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  stepIndicator: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
 scrollContent: {
  flexGrow: 1,
  paddingBottom: 32,
},
content: {
  flexGrow: 1,
  justifyContent: 'center',
  paddingHorizontal: 24,
  paddingTop: 24,
  paddingBottom: 48,
},
  illoPanel: {
    alignItems: 'center',
    borderRadius: 32,
    justifyContent: 'center',
    marginBottom: 32,
    minHeight: 156,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  copy: {
    gap: 12,
    marginBottom: 28,
  },
  heading: {
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  supportingCopy: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 9,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 17,
    height: 58,
    paddingHorizontal: 18,
  },
  codeInput: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 8,
    paddingLeft: 26,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderRadius: 16,
    gap: 4,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryAction: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
})