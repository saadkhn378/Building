import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import client from '../api/client';
import { useMemberAuth } from '../context/AuthContext';
import { formatINR } from '../utils/formatters';

export const MoreScreen = () => {
  const { user, logout } = useMemberAuth();
  const [finances, setFinances] = useState(null);
  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE', 'FINANCES', 'CONTACTS'

  const emergencyContacts = [
    { title: 'Society Office / Manager', phone: '+91 98765 43210' },
    { title: 'Emergency Plumber', phone: '+91 98200 11223' },
    { title: 'Electrician on Call', phone: '+91 98200 44556' },
    { title: 'Lift Emergency Helpline', phone: '1800 200 4357' },
    { title: 'City Police Control Room', phone: '100' },
    { title: 'Fire Station Emergency', phone: '101' },
    { title: 'Ambulance Helpline', phone: '102' },
  ];

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const res = await client.get('/expenses');
        setFinances(res.data);
      } catch (e) {}
    };
    fetchFinances();
  }, []);

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  return (
    <View style={styles.container}>
      {/* Top Profile Card */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'M'}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{user?.fullName || 'Flat Resident'}</Text>
          <Text style={styles.profileSub}>
            Flat {user?.flatNumber || 'A-101'} • {user?.mobile}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PROFILE' && styles.tabItemActive]}
          onPress={() => setActiveTab('PROFILE')}
        >
          <Text style={[styles.tabText, activeTab === 'PROFILE' && styles.tabTextActive]}>
            My Flat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'FINANCES' && styles.tabItemActive]}
          onPress={() => setActiveTab('FINANCES')}
        >
          <Text style={[styles.tabText, activeTab === 'FINANCES' && styles.tabTextActive]}>
            Finances
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'CONTACTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('CONTACTS')}
        >
          <Text style={[styles.tabText, activeTab === 'CONTACTS' && styles.tabTextActive]}>
            Helpline
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile / Flat Details */}
        {activeTab === 'PROFILE' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Flat Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Flat Number</Text>
                <Text style={styles.infoValue}>{user?.flatNumber || 'A-101'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Society</Text>
                <Text style={styles.infoValue}>{user?.societyName || 'Greenview Heights'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registered Mobile</Text>
                <Text style={styles.infoValue}>{user?.mobile}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>Sign Out of App</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Financial Transparency */}
        {activeTab === 'FINANCES' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Society Shared Finances</Text>
              <Text style={styles.cardSub}>
                Visibility Policy: <Text style={styles.policyHighlight}>{finances?.policy || 'SUMMARY'}</Text>
              </Text>

              {finances?.policy === 'PRIVATE' ? (
                <Text style={styles.emptyText}>Financial details are currently set to private by the Chairman.</Text>
              ) : finances?.policy === 'SUMMARY' ? (
                <View style={styles.summaryList}>
                  {finances.summary?.map((item, idx) => (
                    <View key={idx} style={styles.summaryItem}>
                      <Text style={styles.summaryCategory}>{item.category}</Text>
                      <Text style={styles.summaryTotal}>{formatINR(item.total_paise)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.detailedList}>
                  {finances?.expenses?.map((exp) => (
                    <View key={exp.id} style={styles.expenseItem}>
                      <View>
                        <Text style={styles.expenseTitle}>{exp.title}</Text>
                        <Text style={styles.expenseSub}>{exp.category_name} • {exp.vendor_name || 'Vendor'}</Text>
                      </View>
                      <Text style={styles.expenseAmount}>{formatINR(exp.amount_paise)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Emergency Contacts */}
        {activeTab === 'CONTACTS' && (
          <View style={styles.section}>
            {emergencyContacts.map((contact, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.contactCard}
                onPress={() => handleCall(contact.phone)}
              >
                <View>
                  <Text style={styles.contactTitle}>{contact.title}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.callIcon}>
                  <Text style={styles.callIconText}>📞</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  profileHeader: {
    padding: 20,
    paddingTop: 48,
    backgroundColor: '#131B2E',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#22C55E',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#4ADE80',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 14,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cardSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 14,
  },
  policyHighlight: {
    color: '#A855F7',
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  contactCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactPhone: {
    fontSize: 12,
    color: '#4ADE80',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  callIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIconText: {
    fontSize: 16,
  },
  summaryList: {
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  summaryCategory: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  summaryTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4ADE80',
  },
  detailedList: {
    gap: 12,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  expenseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expenseSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F87171',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
  },
});
