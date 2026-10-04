import React, { useState, useEffect } from 'react';
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
import client from '../api/client';

export const CreateComplaintScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [tagId, setTagId] = useState('');
  const [tags, setTags] = useState([]);
  const [photoUri, setPhotoUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await client.get('/complaints/tags');
        setTags(res.data || []);
        if (res.data?.length > 0) {
          setTagId(res.data[0].id);
        }
      } catch (e) {}
    };
    fetchTags();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required to attach an issue photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7, // Compress image to 200-400KB
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a brief title for your complaint.');
      return;
    }

    setSubmitting(true);
    try {
      await client.post('/complaints', {
        title: title.trim(),
        message: message.trim() || 'Photo report submitted.',
        tag_id: tagId || null,
        photo_url: photoUri,
      });

      Alert.alert('Complaint Raised', 'Your report has been sent to the Chairman.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Report Building or Flat Issue</Text>
        <Text style={styles.cardSub}>
          Take a photo and write a quick description. The Chairman will reply directly in your complaint thread.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Issue Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Master bathroom pipe leakage / Lift B jerky"
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category Tag</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
            {tags.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tagPill,
                  tagId === t.id && styles.tagPillActive,
                ]}
                onPress={() => setTagId(t.id)}
              >
                <Text
                  style={[
                    styles.tagPillText,
                    tagId === t.id && styles.tagPillTextActive,
                  ]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photo of Issue (Recommended)</Text>
          {photoUri ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
                <Text style={styles.changeBtnText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadTitle}>Tap to capture / select photo</Text>
              <Text style={styles.uploadSub}>Helps administration resolve issues faster</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description / Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Explain where and when the issue occurred..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Complaint</Text>
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
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 18,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  tagScroll: {
    flexDirection: 'row',
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  tagPillActive: {
    backgroundColor: '#16A34A',
    borderColor: '#22C55E',
  },
  tagPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tagPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  uploadBox: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 26,
    marginBottom: 6,
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
  changeBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    alignItems: 'center',
  },
  changeBtnText: {
    fontSize: 11,
    color: '#4ADE80',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
