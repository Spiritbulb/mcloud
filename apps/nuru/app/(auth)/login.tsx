import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';
import { authStyles } from '@/components/authStyles';

type Step = 'email' | 'code';

export default function Login() {
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = code.trim().length >= 6;

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
              onSubmitEditing={() => emailValid && onSendCode()}
              style={authStyles.input}
              placeholderTextColor={theme.colors.textMuted}
            />
            {error && <Text style={authStyles.error}>{error}</Text>}
            <Button title="Send code" onPress={onSendCode} loading={busy} />
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
