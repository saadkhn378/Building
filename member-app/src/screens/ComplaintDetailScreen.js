import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import client from '../api/client';
import { useMemberAuth } from '../context/AuthContext';

export const ComplaintDetailScreen = ({ route }) => {
  const { id } = route.params;
  const { user } = useMemberAuth();
  const [complaint, setComplaint] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchThread = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/complaints/${id}`);
      setComplaint(res.data);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
  }, [id]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await client.post(`/complaints/${id}/messages`, { message: replyText.trim() });
      setReplyText('');
      fetchThread();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleReopen = async () => {
    try {
      await client.patch(`/complaints/${id}/status`, { status: 'REOPENED' });
      Alert.alert('Complaint Reopened', 'The issue has been reopened and the Chairman notified.');
      fetchThread();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reopen complaint.');
    }
  };

  if (loading || !complaint) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  const isResolved = complaint.status === 'RESOLVED';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Complaint Info Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{complaint.title}</Text>
          <Text style={styles.sub}>
            Tag: {complaint.tag_name || 'General'} • Flat {complaint.flat_number}
          </Text>
        </View>
        <View style={[styles.badge, isResolved ? styles.badgeResolved : styles.badgeOpen]}>
          <Text style={[styles.badgeText, isResolved ? styles.badgeResolvedText : styles.badgeOpenText]}>
            {complaint.status}
          </Text>
        </View>
      </View>

      {/* Messages Thread */}
      <ScrollView style={styles.messagesScroll} contentContainerStyle={styles.messagesContent}>
        {complaint.messages?.map((msg) => {
          const isMe = msg.sender_role === 'OWNER';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                isMe ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text style={styles.senderLabel}>
                {isMe ? 'You' : `${msg.sender_name} (Chairman)`}
              </Text>
              <Text style={styles.messageText}>{msg.message}</Text>

              {msg.signedAttachmentUrl && (
                <Image source={{ uri: msg.signedAttachmentUrl }} style={styles.attachedImage} />
              )}

              <Text style={styles.msgTime}>
                {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Reopen Action Bar (If Resolved) */}
      {isResolved && (
        <View style={styles.resolvedBar}>
          <Text style={styles.resolvedText}>Chairman marked this issue as resolved.</Text>
          <TouchableOpacity style={styles.reopenBtn} onPress={handleReopen}>
            <Text style={styles.reopenBtnText}>Reopen Issue ↺</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reply Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.replyInput}
          placeholder="Reply in this conversation..."
          placeholderTextColor="#64748B"
          value={replyText}
          onChangeText={setReplyText}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSendReply}
          disabled={sending || !replyText.trim()}
        >
          <Text style={styles.sendBtnText}>{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 18,
    backgroundColor: '#131B2E',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOpen: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  badgeOpenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FACC15',
  },
  badgeResolved: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  badgeResolvedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4ADE80',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#16A34A',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  attachedImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 8,
    resizeMode: 'cover',
  },
  msgTime: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  resolvedBar: {
    padding: 12,
    backgroundColor: '#14532D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#22C55E',
  },
  resolvedText: {
    fontSize: 11,
    color: '#BBF7D0',
    fontWeight: '600',
  },
  reopenBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  reopenBtnText: {
    fontSize: 11,
    color: '#F87171',
    fontWeight: '700',
  },
  inputBar: {
    padding: 12,
    backgroundColor: '#131B2E',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  sendBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
