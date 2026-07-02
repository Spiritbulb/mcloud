import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { auth } from '@/services/auth';
import { useSession } from '@/context/SessionContext';
import { theme } from '@/theme';
import { authStyles } from '@/components/authStyles';

export default function Signup() {
  const [name, setName] = useState('');
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
      const user = await auth.signup(name, email, password);
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
          <Text style={theme.typography.title}>Create your account</Text>
          <Text style={[theme.typography.muted, { marginTop: theme.spacing.sm }]}>
            Your notes, one conversation away.
          </Text>
        </View>
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={authStyles.input}
          placeholderTextColor={theme.colors.textMuted}
        />
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
        <Button title="Sign up" onPress={onSubmit} loading={loading} />
        <Link href="/(auth)/login" style={authStyles.link}>
          I already have an account
        </Link>
      </View>
    </Screen>
  );
}
