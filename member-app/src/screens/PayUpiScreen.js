import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import client from '../api/client';
import { formatINR, paiseToRupees } from '../utils/formatters';

export const PayUpiScreen = ({ route, navigation }) => {
  const { bill } = route.params;
  const initialRupees = paiseToRupees(BigInt(bill.total_amount_paise) - BigInt(bill.paid_amount_paise));

  const [amountRupees, setAmountRupees] = useState(initialRupees.toString());
  const [utr, setUtr] = useState('');
  const [remarks, setRemarks] = useState('');
  const [screenshotUri, setScreenshotUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const societyUpiId = 'greenview@upi'; // Fallback / from society profile

  const copyUpiId = async () => {
    await Clipboard.setStringAsync(societyUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required to upload your payment screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7, // Client-side compression to stay within free storage!
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleSubmitProof = async () => {
    if (!utr.trim()) {
      Alert.alert('UTR Required', 'Please enter the 12-digit UTR or Transaction Reference number from your UPI payment app.');
      return;
    }
    if (!screenshotUri) {
      Alert.alert('Screenshot Required', 'Please attach a screenshot of your successful UPI payment as proof for Chairman verification.');
      return;
    }
    if (!amountRupees || Number(amountRupees) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      const amountPaise = Math.round(Number(amountRupees) * 100);

      // In production, file is uploaded via /storage/upload.
      // Here we submit proof with the path/URI.
      await client.post('/payments/submit-proof', {
        bill_id: bill.id,
        amount_paise: amountPaise,
        utr: utr.trim(),
        screenshot_url: screenshotUri,
        remarks: remarks.trim() || null,
      });

      Alert.alert(
        'Proof Submitted! 🎉',
        'Your payment proof has been sent to the Chairman verification queue. The bill will be marked Paid as soon as approved.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit payment proof.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Bill Reference Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>BILL PAYMENT DETAILS</Text>
        <Text style={styles.billNumber}>{bill.bill_number}</Text>
        <Text style={styles.cardSub}>
          Cycle: {bill.billing_period_month}/{bill.billing_period_year} • Flat {bill.flat_number}
        </Text>
      </View>

      {/* UPI QR & VPA Payment Instructions */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>STEP 1: PAY VIA ANY UPI APP</Text>
        <Text style={styles.stepDesc}>
          Pay using Google Pay, PhonePe, Paytm, BHIM, or any banking app to the society official UPI ID:
        </Text>

        <View style={styles.upiCopyBox}>
          <View>
            <Text style={styles.upiLabel}>Official Society UPI ID</Text>
            <Text style={styles.upiId}>{societyUpiId}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={copyUpiId}>
            <Text style={styles.copyBtnText}>{copied ? 'COPIED!' : 'COPY'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Proof Submission Form */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>STEP 2: SUBMIT PAYMENT PROOF</Text>
        <Text style={styles.stepDesc}>
          After paying in your UPI app, enter your UTR and upload the payment screenshot:
        </Text>

        {/* Amount Input (Supports Partial) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Paid Amount (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={amountRupees}
            onChangeText={setAmountRupees}
          />
          <Text style={styles.helperText}>
            You can pay a partial amount if needed. Remaining dues will stay pending.
          </Text>
        </View>

        {/* UTR Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bank UTR / Transaction Reference No. *</Text>
          <TextInput
            style={[styles.input, styles.utrInput]}
            placeholder="e.g. 329104829104"
            placeholderTextColor="#64748B"
            value={utr}
            onChangeText={setUtr}
            autoCapitalize="characters"
          />
          <Text style={styles.helperText}>Found in your UPI app's payment transaction receipt</Text>
        </View>

        {/* Screenshot Uploader */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Upload Payment Screenshot *</Text>
          {screenshotUri ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: screenshotUri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.changePicBtn} onPress={pickScreenshot}>
                <Text style={styles.changePicText}>Change Screenshot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={pickScreenshot}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadTitle}>Tap to select screenshot</Text>
              <Text style={styles.uploadSub}>PNG, JPG compressed automatically</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Remarks Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks / Note (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Paid via brother's account"
            placeholderTextColor="#64748B"
            value={remarks}
            onChangeText={setRemarks}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitProof}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Proof for Verification</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    marginBottom: 14,
  },
  upiCopyBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upiLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  upiId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4ADE80',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  utrInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  uploadBox: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  previewBox: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  changePicBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    alignItems: 'center',
  },
  changePicText: {
    fontSize: 11,
    color: '#4ADE80',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
