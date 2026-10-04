import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import client from '../api/client';
import { useMemberAuth } from '../context/AuthContext';
import { formatINR } from '../utils/formatters';

export const HomeScreen = ({ navigation }) => {
  const { user } = useMemberAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await client.get('/dashboard/member');
      if (res.data) {
        setDashboard(res.data);
      }
    } catch (err) {
      console.warn('Dashboard error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const d = dashboard || {
    currentBill: null,
    totalBalanceDuePaise: '0',
    isDefaulter: false,
    openComplaintsCount: 0,
    recentAnnouncements: [],
    pendingCashPayment: null,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDashboard} tintColor="#22C55E" />}
    >
      {/* Top Welcome Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.userName}>{user?.fullName || 'Resident'}</Text>
        </View>
        <View style={styles.flatBadge}>
          <Text style={styles.flatBadgeText}>Flat {user?.flatNumber || 'A-101'}</Text>
        </View>
      </View>

      {/* Cash Confirmation Urgent Banner (If Chairman initiated cash payment) */}
      {d.pendingCashPayment && (
        <TouchableOpacity
          style={styles.cashAlertBanner}
          onPress={() => navigation.navigate('CashConfirm', { payment: d.pendingCashPayment })}
        >
          <Text style={styles.cashAlertIcon}>💵</Text>
          <View style={styles.cashAlertContent}>
            <Text style={styles.cashAlertTitle}>Confirm Cash Payment</Text>
            <Text style={styles.cashAlertSub}>
              Chairman entered {formatINR(d.pendingCashPayment.amount_paise)}. Tap to enter verbal OTP.
            </Text>
          </View>
          <Text style={styles.cashAlertAction}>Confirm →</Text>
        </TouchableOpacity>
      )}

      {/* Defaulter Warning Banner */}
      {d.isDefaulter && (
        <View style={styles.defaulterBanner}>
          <Text style={styles.defaulterTitle}>⚠️ Defaulter Notice</Text>
          <Text style={styles.defaulterBody}>
            You have 2 or more overdue billing cycles. Please clear pending dues to prevent society service suspension and late fees.
          </Text>
        </View>
      )}

      {/* Main Dues Card */}
      <View style={styles.duesCard}>
        <View style={styles.duesHeader}>
          <Text style={styles.duesCardLabel}>MAINTENANCE DUES</Text>
          {BigInt(d.totalBalanceDuePaise) === 0n ? (
            <View style={styles.statusPillPaid}>
              <Text style={styles.statusPillPaidText}>ALL CLEAR</Text>
            </View>
          ) : (
            <View style={styles.statusPillDue}>
              <Text style={styles.statusPillDueText}>DUE NOW</Text>
            </View>
          )}
        </View>

        <Text style={styles.duesAmount}>{formatINR(d.totalBalanceDuePaise)}</Text>

        {d.currentBill ? (
          <View style={styles.dueDetails}>
            <Text style={styles.dueDetailsText}>
              Period: {d.currentBill.billing_period_month}/{d.currentBill.billing_period_year} • Due by{' '}
              {new Date(d.currentBill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => navigation.navigate('PayUpi', { bill: d.currentBill })}
            >
              <Text style={styles.payButtonText}>Pay via UPI (Instant Proof)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.noDuesText}>
            🎉 Great job! No pending maintenance invoices for your flat.
          </Text>
        )}
      </View>

      {/* Quick Action Grid */}
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => navigation.navigate('Complaints')}
        >
          <Text style={styles.quickIcon}>🛠️</Text>
          <Text style={styles.quickTitle}>Complaints</Text>
          <Text style={styles.quickSub}>{d.openComplaintsCount} Open Issue{d.openComplaintsCount !== 1 ? 's' : ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => navigation.navigate('Bills')}
        >
          <Text style={styles.quickIcon}>📄</Text>
          <Text style={styles.quickTitle}>Bills & Receipts</Text>
          <Text style={styles.quickSub}>View Past Invoices</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Society Announcements */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Announcements</Text>
      </View>

      {d.recentAnnouncements?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent notices from society administration.</Text>
        </View>
      ) : (
        d.recentAnnouncements.map((a) => (
          <View
            key={a.id}
            style={[
              styles.noticeCard,
              a.priority === 'EMERGENCY' && styles.noticeEmergency,
            ]}
          >
            <View style={styles.noticeHeader}>
              <Text
                style={[
                  styles.noticePriority,
                  a.priority === 'EMERGENCY' && styles.noticePriorityEmergency,
                ]}
              >
                {a.priority}
              </Text>
              <Text style={styles.noticeDate}>
                {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <Text style={styles.noticeTitle}>{a.title}</Text>
            <Text style={styles.noticeBody} numberOfLines={3}>
              {a.content}
            </Text>
          </View>
        ))
      )}
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
    paddingTop: 48,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  flatBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  flatBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ADE80',
  },
  cashAlertBanner: {
    backgroundColor: '#14532D',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cashAlertIcon: {
    fontSize: 24,
  },
  cashAlertContent: {
    flex: 1,
  },
  cashAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cashAlertSub: {
    fontSize: 11,
    color: '#BBF7D0',
    marginTop: 2,
  },
  cashAlertAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4ADE80',
  },
  defaulterBanner: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  defaulterTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCA5A5',
    marginBottom: 4,
  },
  defaulterBody: {
    fontSize: 11,
    color: '#FEE2E2',
    lineHeight: 16,
  },
  duesCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  duesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  duesCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  statusPillDue: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusPillDueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F87171',
  },
  statusPillPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusPillPaidText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4ADE80',
  },
  duesAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  dueDetails: {
    marginTop: 10,
  },
  dueDetailsText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 12,
  },
  payButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noDuesText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quickIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noticeCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  noticeEmergency: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(127, 29, 29, 0.15)',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noticePriority: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  noticePriorityEmergency: {
    color: '#EF4444',
  },
  noticeDate: {
    fontSize: 10,
    color: '#64748B',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
  },
});
