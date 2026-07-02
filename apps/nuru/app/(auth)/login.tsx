import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Brand } from '@/components/Brand';
import { auth } from '@/services/auth';
import { useSession } from '@/context/SessionContext';
import { theme } from '@/theme';
import { authStyles } from '@/components/authStyles';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useSession();
  const router = useRouter();

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const user = await auth.login(email, password);
      setUser(user);
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={authStyles.wrap}>
        <View style={authStyles.hero}>
          <Brand size="lg" withLogo tagline="Talk to your notes." />
        </View>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={authStyles.input}
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={authStyles.input}
          placeholderTextColor={theme.colors.textMuted}
        />
        {error && <Text style={authStyles.error}>{error}</Text>}
        <Button title="Log in" onPress={onSubmit} loading={loading} />
        <Link href="/(auth)/signup" style={authStyles.link}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}
