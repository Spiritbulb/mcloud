// Home / sign-in — native magic-code auth (no browser). Two steps: enter email →
// enter the 6-digit code emailed by WorkOS. One flow covers sign-in AND sign-up,
// so a brand-new user just enters their email and the code. Expressive Material 3,
// follows system light/dark.
import * as React from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
    config.reviewEmail !== '' && email.trim().toLowerCase() === config.reviewEmail

  if (loading) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: t.colors.background }]}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    )
  }

  if (user) return <Redirect href="/(app)/orgs" />

  const onSendCode = async () => {
    setError(null)
    setBusy(true)
    try {
      await sendCode(email.trim())
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send a code.')
    } finally {
      setBusy(false)
    }
  }

  const onVerify = async () => {
    setError(null)
    setBusy(true)
    try {
      await verifyCode(email.trim(), code.trim())
      // On success the auth state flips to a user and the Redirect above fires.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code is invalid or expired.')
    } finally {
      setBusy(false)
    }
  }

  const onPasswordSignIn = async () => {
    setError(null)
    setBusy(true)
    try {
      await verifyPassword(email.trim(), password)
      // On success the auth state flips to a user and the Redirect above fires.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid credentials.')
    } finally {
      setBusy(false)
    }
  }

  const onChangeEmail = () => {
    setStep('email')
    setCode('')
    setError(null)
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const codeValid = code.trim().length >= 6

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        // Android needs an explicit behavior — `undefined` is a no-op that lets the
        // keyboard cover the inputs. 'height' shrinks the view so the footer
        // (inputs + buttons) rides above the keyboard; iOS uses 'padding'.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.body}>
          <FadeInUp delay={0}>
            <View style={[styles.illoPanel, { backgroundColor: t.colors.primaryContainer }]}>
              <MarketingImage name="marketing-make-it-yours.png" width={220} height={180} />
            </View>
          </FadeInUp>

          <View style={styles.copy}>
            <FadeInUp delay={80}>
              <Text style={[t.type.overline, { color: t.colors.primary }]}>MENENGAI CLOUD</Text>
            </FadeInUp>
            <FadeInUp delay={140}>
              <Text style={[t.type.displaySmall, { color: t.colors.onSurface, fontWeight: '700' }]}>
                {step === 'email' ? 'Run your stores\nfrom your pocket.' : 'Check your email.'}
              </Text>
            </FadeInUp>
            <FadeInUp delay={200}>
              <Text style={[t.type.bodyLarge, { color: t.colors.onSurfaceVariant, maxWidth: 330 }]}>
                {step === 'email'
                  ? 'Enter your email and we’ll send you a sign-in code. New here? The same code creates your account.'
                  : `We sent a 6-digit code to ${email.trim()}. Enter it below to sign in.`}
              </Text>
            </FadeInUp>
          </View>
        </View>

        <FadeInUp delay={260} style={styles.footer}>
          {error && (
            <View style={[styles.errorChip, { backgroundColor: t.colors.errorContainer }]}>
              <Text style={[t.type.bodyMedium, { color: t.colors.onErrorContainer }]}>{error}</Text>
            </View>
          )}

          {step === 'email' ? (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={t.colors.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
                returnKeyType="send"
                editable={!busy}
                onSubmitEditing={() => emailValid && !isReviewEmail && onSendCode()}
                style={[
                  styles.input,
                  {
                    backgroundColor: t.colors.surfaceVariant,
                    color: t.colors.onSurface,
                    borderColor: t.colors.outline,
                  },
                ]}
              />
              {isReviewEmail ? (
                <>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={t.colors.onSurfaceVariant}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    editable={!busy}
                    returnKeyType="go"
                    onSubmitEditing={() => password.length > 0 && onPasswordSignIn()}
                    style={[
                      styles.input,
                      {
                        backgroundColor: t.colors.surfaceVariant,
                        color: t.colors.onSurface,
                        borderColor: t.colors.outline,
                      },
                    ]}
                  />
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
                  label="Send code"
                  onPress={onSendCode}
                  loading={busy}
                  disabled={!emailValid}
                  variant="filled"
                />
              )}
            </>
          ) : (
            <>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
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
                onSubmitEditing={() => codeValid && onVerify()}
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
              <Button
                label="Sign in"
                onPress={onVerify}
                loading={busy}
                disabled={!codeValid}
                variant="filled"
              />
              <Text
                onPress={busy ? undefined : onChangeEmail}
                style={[t.type.labelLarge, styles.link, { color: t.colors.primary }]}
              >
                Use a different email
              </Text>
            </>
          )}
        </FadeInUp>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 32 },
  illoPanel: {
    borderRadius: 28,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 14 },
  footer: { paddingHorizontal: 28, paddingBottom: 28, gap: 12 },
  errorChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  input: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 17,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: '700',
  },
  link: { textAlign: 'center', paddingVertical: 6 },
})
