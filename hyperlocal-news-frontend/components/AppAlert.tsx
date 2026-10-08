import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AppAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  onDismiss?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export const AppAlert = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onDismiss,
  icon,
  iconColor,
}: AppAlertProps) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handleButton = (btn: AppAlertButton) => {
    onDismiss?.();
    btn.onPress?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: isDark ? '#000' : '#1e1e3f',
            },
          ]}
        >
          {/* Icon */}
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons
                name={icon}
                size={28}
                color={iconColor ?? colors.primary}
              />
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          ) : null}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Buttons */}
          <View style={[styles.buttonsRow, buttons.length > 2 && styles.buttonsColumn]}>
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const isLast = index === buttons.length - 1;

              return (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      buttons.length <= 2 && { flex: 1 },
                      buttons.length > 2 && styles.buttonFull,
                      isDestructive && { backgroundColor: 'rgba(239,68,68,0.1)' },
                      !isDestructive && !isCancel && index === buttons.length - 1 && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleButton(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && { color: '#EF4444' },
                        isCancel && { color: colors.textSecondary },
                        !isDestructive && !isCancel && index === buttons.length - 1 && {
                          color: '#FFFFFF',
                          fontWeight: '700',
                        },
                        !isDestructive && !isCancel && index !== buttons.length - 1 && {
                          color: colors.primary,
                        },
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                  {/* Vertical divider between side-by-side buttons */}
                  {buttons.length === 2 && index === 0 && (
                    <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

const DEFAULT_STATE: AlertState = {
  visible: false,
  title: '',
};

/**
 * useAppAlert — drop-in replacement for Alert.alert()
 *
 * Usage:
 *   const { alert, AlertComponent } = useAppAlert();
 *   alert('Title', 'Message', [{ text: 'OK' }]);
 *   ...
 *   return <>{AlertComponent}</>;
 */
export function useAppAlert() {
  const [state, setState] = React.useState<AlertState>(DEFAULT_STATE);

  const dismiss = React.useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const alert = React.useCallback(
    (
      title: string,
      message?: string,
      buttons?: AppAlertButton[],
      opts?: { icon?: keyof typeof Ionicons.glyphMap; iconColor?: string }
    ) => {
      setState({
        visible: true,
        title,
        message,
        buttons,
        icon: opts?.icon,
        iconColor: opts?.iconColor,
      });
    },
    []
  );

  const AlertComponent = (
    <AppAlert
      visible={state.visible}
      title={state.title}
      message={state.message}
      buttons={state.buttons}
      onDismiss={dismiss}
      icon={state.icon}
      iconColor={state.iconColor}
    />
  );

  return { alert, AlertComponent };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  container: {
    width: SCREEN_WIDTH - 64,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginTop: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    minHeight: 50,
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 0,
  },
  buttonFull: {
    width: '100%',
    borderTopWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  verticalDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
});
