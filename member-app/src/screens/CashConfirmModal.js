import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import client from '../api/client';
import { formatINR } from '../utils/formatters';

export const CashConfirmModal = ({ route, navigation }) => {
  const { payment } = route.params;
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit confirmation OTP verbally provided by your Chairman.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post('/cash-payments/confirm', {
        payment_id: payment.id,
        otp: otp.trim(),
      });

      Alert.alert(
        'Cash Payment Confirmed! 🎉',
        `Receipt #${res.data?.receiptNumber || 'REC'} has been generated. Your bill is now marked Paid.`,
        [{ text: 'Great', onPress: () => navigation.navigate('Home') }]
      );
    } catch (err) {
      Alert.alert('Confirmation Failed', err.message || 'Incorrect confirmation code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>💵</Text>
        </View>

        <Text style={styles.title}>Confirm Physical Cash Payment</Text>
        <Text style={styles.subtitle}>
          Chairman recorded receiving <Text style={styles.highlight}>{formatINR(payment.amount_paise)}</Text> in cash for your flat maintenance.
        </Text>

        <View style={styles.otpBox}>
          <Text style={styles.otpLabel}>Enter 6-Digit Verbal Confirmation Code</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="••••••"
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <Text style={styles.otpHelp}>
            The Chairman verbally tells you this code when taking cash. Never give your money without receiving this code.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Cash Receipt</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#22C55E',
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  highlight: {
    color: '#4ADE80',
    fontWeight: '800',
  },
  otpBox: {
    width: '100%',
    marginVertical: 20,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 8,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 14,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 10,
    color: '#4ADE80',
  },
  otpHelp: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: '#16A34A',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelBtn: {
    marginTop: 14,
    padding: 6,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#64748B',
  },
});
