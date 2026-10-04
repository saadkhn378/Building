import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMemberAuth } from '../context/AuthContext';

export const OnboardingScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Invite Code, 2: Set PIN
  const [mobile, setMobile] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [ticket, setTicket] = useState(null);
  const [memberInfo, setMemberInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const { verifyInviteCode, completePinSetup } = useMemberAuth();

  const handleVerifyCode = async () => {
    if (!mobile.trim() || !inviteCode.trim()) {
      Alert.alert('Required Fields', 'Please enter your mobile number and the 6-digit invite code provided by your Chairman.');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyInviteCode(mobile, inviteCode);
      setTicket(data.ticket);
      setMemberInfo(data.member);
      setStep(2);
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid invite code or mobile number.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit numeric PIN.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'The confirmation PIN does not match. Please re-enter.');
      return;
    }
    setLoading(true);
    try {
      await completePinSetup(ticket, pin);
    } catch (err) {
      Alert.alert('PIN Setup Failed', err.message || 'Could not complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏢</Text>
          </View>
          <Text style={styles.title}>Welcome to Society Member</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter the 6-digit invite code shared by your Chairman'
              : `Hello ${memberInfo?.fullName || 'Member'}! Set your 4-digit PIN for Flat ${memberInfo?.flatNumber}`}
          </Text>
        </View>

        {/* Step 1: Invite Code Verification */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registered Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>6-Digit Invite Code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="e.g. 849201"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={inviteCode}
                onChangeText={setInviteCode}
                maxLength={6}
              />
              <Text style={styles.helperText}>
                No SMS required. Ask your Society Chairman if you haven't received your code.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Invite Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.switchButtonText}>Already set up your PIN? Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Set 4-Digit PIN */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Create 4-Digit App PIN</Text>
              <TextInput
                style={[styles.input, styles.pinInput]}
                placeholder="••••"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                secureTextEntry
                value={pin}
                onChangeText={setPin}
                maxLength={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm 4-Digit PIN</Text>
              <TextInput
                style={[styles.input, styles.pinInput]}
                placeholder="••••"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                secureTextEntry
                value={confirmPin}
                onChangeText={setConfirmPin}
                maxLength={4}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSetPin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Complete Setup & Enter App</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  codeInput: {
    letterSpacing: 4,
    fontSize: 18,
    fontWeight: '700',
  },
  pinInput: {
    letterSpacing: 12,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 15,
  },
  primaryButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 13,
    color: '#4ADE80',
    fontWeight: '600',
  },
});
