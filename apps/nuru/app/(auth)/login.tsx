import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { makeAuthStyles } from '@/components/authStyles';
import { config } from '@/lib/config';

type Step = 'email' | 'code';

export default function Login() {
  const { theme } = useTheme();
  const authStyles = useMemo(() => makeAuthStyles(theme), [theme]);
  const { sendCode, verifyCode, verifyPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = code.trim().length >= 6;
  // Reveal a password field only for the app-store review email (reviewers can't
  // get the magic code). Empty config.reviewEmail => never shows.
  const isReviewEmail =
    config.reviewEmail !== '' && email.trim().toLowerCase() === config.reviewEmail;

  async function onSendCode() {
    setError(null);
    setBusy(true);
    try {
      await sendCode(email.trim());
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setError(null);
    setBusy(true);
    try {
      await verifyCode(email.trim(), code.trim());
      // Success flips auth state; the root guard redirects to (tabs).
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onPasswordSignIn() {
    setError(null);
    setBusy(true);
    try {
      await verifyPassword(email.trim(), password);
      // Success flips auth state; the root guard redirects to (tabs).
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onChangeEmail() {
    setStep('email');
    setCode('');
    setError(null);
  }

  return (
    <Screen keyboardAvoiding>
      <View style={authStyles.wrap}>
        <View style={authStyles.hero}>
          <Brand size="lg" withLogo tagline={step === 'email' ? 'Talk to your notes.' : 'Check your email.'} />
        </View>

        {step === 'email' ? (
          <>
            <TextInput
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              onSubmitEditing={() => emailValid && !isReviewEmail && onSendCode()}
              style={authStyles.input}
              placeholderTextColor={theme.colors.textMuted}
            />
            {isReviewEmail && (
              <TextInput
                placeholder="Password"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                onSubmitEditing={() => password.length > 0 && onPasswordSignIn()}
                style={authStyles.input}
                placeholderTextColor={theme.colors.textMuted}
              />
            )}
            {error && <Text style={authStyles.error}>{error}</Text>}
            {isReviewEmail ? (
              <Button title="Sign in" onPress={onPasswordSignIn} loading={busy} />
            ) : (
              <Button title="Send code" onPress={onSendCode} loading={busy} />
            )}
          </>
        ) : (
          <>
            <Text style={[theme.typography.muted, { textAlign: 'center' }]}>
              We sent a 6-digit code to {email.trim()}.
            </Text>
            <TextInput
              placeholder="123456"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              editable={!busy}
              onSubmitEditing={() => codeValid && onVerify()}
              style={[authStyles.input, authStyles.codeInput]}
              placeholderTextColor={theme.colors.textMuted}
            />
            {error && <Text style={authStyles.error}>{error}</Text>}
            <Button title="Sign in" onPress={onVerify} loading={busy} />
            <Text onPress={busy ? undefined : onChangeEmail} style={authStyles.changeLink}>
              Use a different email
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}
