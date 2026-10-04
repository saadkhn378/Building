import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import client, { API_BASE_URL } from '../api/client';
import { formatINR } from '../utils/formatters';

export const BillsScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await client.get('/billing/bills');
      setBills(res.data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <View style={[styles.badge, styles.badgePaid]}><Text style={styles.badgePaidText}>PAID</Text></View>;
      case 'VERIFICATION_PENDING':
        return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgePendingText}>VERIFYING</Text></View>;
      case 'PARTIALLY_PAID':
        return <View style={[styles.badge, styles.badgePartial]}><Text style={styles.badgePartialText}>PARTIAL</Text></View>;
      case 'OVERDUE':
        return <View style={[styles.badge, styles.badgeOverdue]}><Text style={styles.badgeOverdueText}>OVERDUE</Text></View>;
      default:
        return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgePendingText}>UNPAID</Text></View>;
    }
  };

  const renderItem = ({ item }) => {
    const isPayable = item.status !== 'PAID' && item.status !== 'CANCELLED';

    return (
      <View style={styles.billCard}>
        <View style={styles.billCardHeader}>
          <View>
            <Text style={styles.billCycle}>
              {new Date(2026, item.billing_period_month - 1).toLocaleString('default', { month: 'long' })} {item.billing_period_year}
            </Text>
            <Text style={styles.billNumber}>#{item.bill_number}</Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.amountStrip}>
          <View>
            <Text style={styles.amountLabel}>Total Billed</Text>
            <Text style={styles.amountValue}>{formatINR(item.total_amount_paise)}</Text>
          </View>
          <View style={styles.amountRight}>
            <Text style={styles.amountLabel}>Paid So Far</Text>
            <Text style={styles.amountPaidValue}>{formatINR(item.paid_amount_paise)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dueDateText}>
            Due: {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>

          <View style={styles.actionsRow}>
            {item.receipt_id && (
              <TouchableOpacity
                style={styles.receiptBtn}
                onPress={() => Linking.openURL(`${API_BASE_URL}/receipts/${item.receipt_id}/download`)}
              >
                <Text style={styles.receiptBtnText}>Receipt 📄</Text>
              </TouchableOpacity>
            )}

            {isPayable && (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => navigation.navigate('PayUpi', { bill: item })}
              >
                <Text style={styles.payBtnText}>Pay Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBills} tintColor="#22C55E" />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No bills generated for your flat yet.</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  billCard: {
    backgroundColor: '#131B2E',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  billCycle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  billNumber: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  badgePaidText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4ADE80',
  },
  badgePending: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FACC15',
  },
  badgePartial: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  badgePartialText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  badgeOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeOverdueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F87171',
  },
  amountStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  amountRight: {
    alignItems: 'flex-end',
  },
  amountPaidValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4ADE80',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueDateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  receiptBtnText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  payBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#16A34A',
  },
  payBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
  },
});
