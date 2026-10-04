import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import client from '../api/client';

export const ComplaintsScreen = ({ navigation }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await client.get('/complaints');
      setComplaints(res.data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchComplaints();
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => {
    const isResolved = item.status === 'RESOLVED';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ComplaintDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View
            style={[
              styles.badge,
              isResolved ? styles.badgeResolved : styles.badgeOpen,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isResolved ? styles.badgeResolvedText : styles.badgeOpenText,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.tagText}>🏷️ {item.tag_name || 'General'}</Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchComplaints} tintColor="#22C55E" />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>No Complaints Logged</Text>
              <Text style={styles.emptySub}>
                Have an issue with plumbing, lift, or electricals? Tap "Raise Complaint" to report it directly to the Chairman.
              </Text>
            </View>
          )
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateComplaint')}
      >
        <Text style={styles.fabText}>+ Raise Complaint</Text>
      </TouchableOpacity>
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
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOpen: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  badgeOpenText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FACC15',
  },
  badgeResolved: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  badgeResolvedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4ADE80',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    left: 20,
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
