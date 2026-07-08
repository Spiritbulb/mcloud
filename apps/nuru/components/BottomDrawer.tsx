// apps/nuru/components/BottomDrawer.tsx
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useMemo, type ReactNode } from 'react';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function BottomDrawer({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            {children}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(254, 254, 254, 0)',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    safeArea: {
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceAlt,
      marginBottom: theme.spacing.xs,
    },
    header: {
      gap: 4,
      paddingBottom: theme.spacing.xs,
    },
    title: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
  });
}