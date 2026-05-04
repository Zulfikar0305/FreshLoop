// screens/auth/OnboardDocUpload.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';

const DOC_CONFIG = {
  business: {
    label: 'Trading Licence',
    icon: 'file-text' as const,
    hint: 'Upload a clear photo or scan of your valid trading licence issued by your local municipality.',
  },
  npo: {
    label: 'NPO Registration Certificate',
    icon: 'award' as const,
    hint: 'Upload your NPO registration certificate issued by the Department of Social Development.',
  },
};

const REQUIREMENTS = [
  'Must be valid and not expired',
  'All text must be clearly legible',
  'All four corners must be visible',
  'File size under 10 MB',
];

export default function OnboardDocUpload({
  role,
  onContinue,
}: {
  role: 'business' | 'npo';
  onContinue: () => void;
}) {
  const { session } = useAuth();
  const [uploaded,  setUploaded]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName,  setFileName]  = useState('');

  const cfg = DOC_CONFIG[role];

  /** Upload a local file URI to Firebase Storage, then persist metadata to Firestore. */
  const doUpload = async (uri: string, name: string) => {
    const userId = session?.userId;
    if (!userId) {
      Alert.alert('Error', 'You must be signed in to upload documents.');
      return;
    }
    setUploading(true);
    try {
      // Fetch the local URI as a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const path = `verificationDocs/${userId}/${Date.now()}-${name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      // Persist metadata to Firestore
      await setDoc(
        doc(db, 'users', userId),
        {
          verificationDocuments: arrayUnion({
            fileName: name,
            storagePath: fileRef.fullPath,
            downloadURL,
            uploadedAt: new Date().toISOString(),
            docType: cfg.label,
          }),
          verificationStatus:          'pending',
          verificationStatusUpdatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setFileName(name);
      setUploaded(true);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload your document. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleGallery = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        await doUpload(asset.uri, asset.name);
      }
    } catch {
      Alert.alert('Error', 'Could not open file picker. Please try again.');
    }
  };

  const handleCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required to photograph your document.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets?.length) {
        const uri  = result.assets[0].uri;
        const name = uri.split('/').pop() ?? 'document_photo.jpg';
        await doUpload(uri, name);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  const handleRemove = () => {
    setUploaded(false);
    setFileName('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E2EBE1' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1C3A2E" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#1C3A2E' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
          justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 38, height: 38, borderRadius: 11, overflow: 'hidden',
              borderWidth: 1.5, borderColor: 'rgba(134,239,172,0.3)', marginRight: 10,
            }}>
              <Image
                source={require('../../assets/Logo.jpeg')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>
              Fresh<Text style={{ color: '#4ADE80' }}>Loop</Text>
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10,
            paddingHorizontal: 10, paddingVertical: 5,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' }}>
              Step 5 of 5
            </Text>
          </View>
        </View>
        {/* Progress bar — full */}
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20, borderRadius: 2, marginBottom: 16 }}>
          <View style={{ height: 3, width: '100%', backgroundColor: '#4ADE80', borderRadius: 2 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ marginBottom: 24, marginTop: 4 }}>
          <Text style={{ color: '#1E293B', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            Upload your {cfg.label} 📄
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, lineHeight: 20 }}>
            {cfg.hint}
          </Text>
        </View>

        {/* Pending notice */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: '#FFF7ED', borderRadius: 14, borderWidth: 1,
          borderColor: '#FED7AA', padding: 14, marginBottom: 24,
        }}>
          <Feather name="clock" size={15} color="#EA580C" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, color: '#9A3412', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>
            Your account will show as{' '}
            <Text style={{ fontWeight: '800' }}>Pending Verification</Text>
            {' '}until an Admin reviews your document. This usually takes 1–2 business days.
          </Text>
        </View>

        {/* Upload area */}
        {!uploaded ? (
          <View style={{
            borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1',
            borderRadius: 18, padding: 28, alignItems: 'center',
            backgroundColor: '#fff', marginBottom: 16,
          }}>
            {uploading ? (
              <>
                <ActivityIndicator size="large" color="#2D6A4F" style={{ marginBottom: 14 }} />
                <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 14 }}>
                  Uploading document…
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                  Please wait, do not close this screen.
                </Text>
              </>
            ) : (
              <>
                <View style={{
                  width: 60, height: 60, borderRadius: 18,
                  backgroundColor: 'rgba(45,106,79,0.08)',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <Feather name={cfg.icon} size={26} color="#2D6A4F" />
                </View>
                <Text style={{ color: '#1E293B', fontWeight: '800', fontSize: 15, marginBottom: 6 }}>
                  Choose your document
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20 }}>
                  JPG, PNG or PDF • Max 10 MB
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                  <TouchableOpacity
                    onPress={handleGallery}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, backgroundColor: '#2D6A4F', borderRadius: 12,
                      paddingVertical: 12, alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Feather name="folder" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Browse Files</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCamera}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, backgroundColor: '#fff', borderRadius: 12,
                      paddingVertical: 12, alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center', gap: 8,
                      borderWidth: 1.5, borderColor: '#2D6A4F',
                    }}
                  >
                    <Feather name="camera" size={16} color="#2D6A4F" />
                    <Text style={{ color: '#2D6A4F', fontWeight: '700', fontSize: 14 }}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={{
            backgroundColor: '#F0FDF4', borderRadius: 18, padding: 16,
            borderWidth: 1.5, borderColor: '#A7F3D0', marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 14,
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: 'rgba(16,185,129,0.12)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Feather name="file-text" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 14, marginBottom: 2 }}>
                {fileName}
              </Text>
              <Text style={{ color: '#047857', fontSize: 12 }}>Ready to submit</Text>
            </View>
            <TouchableOpacity
              onPress={handleRemove}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color="#6EE7B7" />
            </TouchableOpacity>
          </View>
        )}

        {/* Requirements checklist */}
        <Text style={{
          fontSize: 10, fontWeight: '700', color: '#94A3B8',
          letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
        }}>
          Document requirements
        </Text>
        <View style={{
          backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
          borderColor: '#E2E8F0', marginBottom: 28, overflow: 'hidden',
        }}>
          {REQUIREMENTS.map((req, i) => (
            <View
              key={req}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14,
                borderBottomWidth: i < REQUIREMENTS.length - 1 ? 1 : 0,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <Feather name="check" size={14} color="#2D6A4F" />
              <Text style={{ color: '#475569', fontSize: 13, fontWeight: '600', flex: 1 }}>{req}</Text>
            </View>
          ))}
        </View>

        {/* Submit button */}
        <TouchableOpacity
          onPress={onContinue}
          activeOpacity={0.85}
          disabled={!uploaded || uploading}
          style={{
            backgroundColor: uploaded && !uploading ? '#2D6A4F' : '#CBD5E1',
            borderRadius: 14, paddingVertical: 15,
            alignItems: 'center', marginBottom: 12,
            shadowColor: '#2D6A4F',
            shadowOpacity: uploaded && !uploading ? 0.3 : 0,
            shadowRadius: 10,
            elevation: uploaded && !uploading ? 4 : 0,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            Submit & Finish Setup →
          </Text>
        </TouchableOpacity>

        <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          You can replace this document later from your Profile.
        </Text>
      </ScrollView>
    </View>
  );
}
