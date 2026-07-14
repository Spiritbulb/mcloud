// apps/nuru/components/AttachMenu.tsx
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomDrawer } from './BottomDrawer';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPickFiles: () => void;
};

export function AttachMenu({ visible, onClose, onPickFiles }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      title="Attach"
      subtitle="Add something to your message"
    >
      <View style={styles.list}>
        <Pressable
          onPress={() => {
            onClose();
            onPickFiles();
          }}
          accessibilityLabel="Attach files"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="document-outline" size={18} color={theme.colors.primary} />
          </View>

          <View style={styles.copy}>
            <Text style={styles.label}>Files</Text>
            <Text style={styles.meta}>PDFs, notes, and documents</Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </Pressable>

        <View style={styles.divider} />

        <View style={[styles.row, styles.rowDisabled]} accessibilityLabel="Camera coming soon">
          <View style={styles.iconWrapMuted}>
            <Ionicons name="camera-outline" size={18} color={theme.colors.textMuted} />
          </View>

          <View style={styles.copy}>
            <Text style={styles.labelMuted}>Camera</Text>
            <Text style={styles.meta}>Coming soon</Text>
          </View>
        </View>
      </View>
    </BottomDrawer>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
    },
    row: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    rowPressed: {
      opacity: 0.9,
    },
    rowDisabled: {
      opacity: 0.48,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapMuted: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    labelMuted: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: '600',
    },
    meta: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginLeft: 56,
    },
  });
}