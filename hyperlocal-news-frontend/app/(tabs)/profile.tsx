import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CreateArticleModal } from '@/components/CreateArticleModal';
import { useCreateNews, useDeleteNews } from '@/hooks/useNews';
import { useDeletePost } from '@/hooks/usePosts';
import { useBookmarks } from '@/hooks/useEngagement';
import { usersApi, postsApi, type DashboardResponse } from '@/services/api';
import type { Post } from '@/services/api/posts';
import { compressImage } from '@/services/image';
import { uploadImageToSupabaseNews, uploadImageToSupabaseProfile } from '@/services/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ProfileScreen() {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user, logout, updateProfile, updateProfileLocal, switchToPublisher } = useAuthStore();

  // ─── Dashboard Data ──────────────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // ─── UI State ────────────────────────────────────────────────────────────
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ─── API Mutations ───────────────────────────────────────────────────────
  const { mutate: createArticleMutate } = useCreateNews();
  const { mutate: deleteArticleMutate } = useDeleteNews();
  const { mutate: deletePostMutate } = useDeletePost();

  const handleDeleteUserPost = (postUid: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePostMutate(postUid, {
              onSuccess: () => {
                setPosts((prev) => prev.filter((p) => p.post_uid !== postUid));
                setSelectedPost(null);
                Alert.alert('Success', 'Post deleted successfully.');
              },
              onError: (err: any) => {
                Alert.alert('Error', err?.message || 'Failed to delete post.');
              },
            });
          },
        },
      ]
    );
  };

  // ✅ API hooks - Fetch BOTH content types
  const { data: newsBookmarks = [] } = useBookmarks('news');
  const { data: postBookmarks = [] } = useBookmarks('post');

  // ✅ Combine bookmarks
  const allBookmarks = [...newsBookmarks, ...postBookmarks];

  // ─── Tab State ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'posts' | 'news' | 'saved' | 'publisher'>('posts');
  const [newsFilter, setNewsFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [newsSort, setNewsSort] = useState<'date' | 'views' | 'likes'>('date');
  const [showSortModal, setShowSortModal] = useState(false);

  // ─── FAB / Modal State ───────────────────────────────────────────────────
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showCreateArticleModal, setShowCreateArticleModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);

  // ─── Post State ──────────────────────────────────────────────────────────
  const [postCaption, setPostCaption] = useState('');
  const [postCoverImage, setPostCoverImage] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const loadComments = async (postUid: string) => {
    setIsLoadingComments(true);
    try {
      const res = await postsApi.getComments(postUid);
      const commentsList = Array.isArray(res)
        ? res
        : res && Array.isArray((res as any).comments)
          ? (res as any).comments
          : [];
      setComments(commentsList);
    } catch (err) {
      console.warn('[profile] Failed to load comments from API:', err);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (selectedPost) {
      loadComments(selectedPost.post_uid);
    } else {
      setComments([]);
      setNewCommentText('');
    }
  }, [selectedPost?.post_uid]);

  const handleLikePost = async (postUid: string) => {
    try {
      const res = await postsApi.likePost(postUid);
      setSelectedPost(prev => prev ? { ...prev, is_liked: res.liked, like_count: res.like_count } : null);
      setPosts(prev => prev.map(p => p.post_uid === postUid ? { ...p, is_liked: res.liked, like_count: res.like_count } : p));
    } catch (err) {
      console.error('[profile] Failed to like post:', err);
    }
  };

  const handleSharePost = async (postUid: string) => {
    try {
      await Share.share({
        message: selectedPost?.content || 'Check out this post!',
      });
      await postsApi.sharePost(postUid, 'native');
      setSelectedPost(prev => prev ? { ...prev, share_count: (prev.share_count ?? 0) + 1 } : null);
      setPosts(prev => prev.map(p => p.post_uid === postUid ? { ...p, share_count: (p.share_count ?? 0) + 1 } : p));
    } catch (err) {
      console.error('[profile] Failed to share post:', err);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newCommentText.trim()) return;
    const text = newCommentText.trim();
    setNewCommentText('');

    try {
      try {
        await postsApi.addComment(selectedPost.post_uid, text);
      } catch (apiErr) {
        console.warn('[profile] Failed to post comment to server, adding locally:', apiErr);
      }

      const commentItem = {
        id: Date.now(),
        post_uid: selectedPost.post_uid,
        user_uid: user?.user_uid || 'me',
        user_name: user?.name || 'You',
        user_avatar: user?.profile_picture,
        comment_text: text,
        created_at: new Date().toISOString(),
      };

      setComments(prev => [commentItem, ...prev]);

      setSelectedPost(prev => prev ? { ...prev, comment_count: (prev.comment_count ?? 0) + 1 } : null);
      setPosts(prev => prev.map(p => p.post_uid === selectedPost.post_uid ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p));
    } catch (error) {
      console.error('[profile] Failed to add comment:', error);
    }
  };

  const loadUserPosts = async () => {
    if (!user?.user_uid) return;
    setIsLoadingPosts(true);
    try {
      const response = await postsApi.getUserPosts(user.user_uid);
      setPosts(response.posts || []);
    } catch (error) {
      console.error('[profile] Failed to load user posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // ─── Publisher Application State ─────────────────────────────────────────
  const [isApplyingPublisher, setIsApplyingPublisher] = useState(false);

  // ─── Derived from Dashboard ───────────────────────────────────────────────

  const displayName = dashboardData?.user.name || user?.name || 'User';
  const userHandle = '@' + (dashboardData?.user.user_name || user?.user_name || 'user');
  const userLocation = dashboardData?.user.location || 'Set Location';
  const followersCount = dashboardData?.user.followers_count ?? 0;
  const followingCount = dashboardData?.user.following_count ?? 0;
  const profileCompletion = dashboardData?.user.profile_completion ?? 0;
  const unreadNotifications = dashboardData?.user.unread_notifications ?? 0;
  const joinedDate = dashboardData?.user.joined_date ?? (
    user?.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Recently'
  );

  // ─── Publisher / CTA ──────────────────────────────────────────────────────

  const isPublisher = dashboardData?.user.is_publisher ?? user?.isPublisher ?? false;
  const canApplyForPublisher = dashboardData?.publisher_cta?.can_apply ?? false;
  const publisherMessage = dashboardData?.publisher_cta?.message ?? 'Get verified as a Publisher to write and publish news for your city.';
  const missingRequirements = dashboardData?.publisher_cta?.missing_requirements ?? [];

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = {
    posts: String(dashboardData?.stats?.total_posts ?? 0),
    likes: String(dashboardData?.stats?.total_likes ?? 0),
    comments: String(dashboardData?.stats?.total_comments ?? 0),
    level: dashboardData?.stats?.level_name || 'Contributor',
    coins: String(dashboardData?.stats?.coins ?? 0),
    points: String(dashboardData?.stats?.points ?? 0),
  };

  // ─── Avatar ───────────────────────────────────────────────────────────────

  const avatarUri =
    dashboardData?.user.profile_picture ||
    user?.profile_picture ||
    user?.avatar ||
    'https://placehold.co/200x200/E2E8F0/E2E8F0?text=U';

  // ─── Load Dashboard ───────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoadingProfile(true);
      try {
        const dashboardResponse = await usersApi.dashboard({
          detailed: true,
          page: 1,
          limit: 20,
          recent_limit: 5,
        });

        if (!isMounted) return;

        setDashboardData(dashboardResponse);

        // ✅ Sync auth store with latest profile from dashboard
        updateProfileLocal({
          name: dashboardResponse.user.name,
          user_name: dashboardResponse.user.user_name,
          avatar: dashboardResponse.user.profile_picture,
          profile_picture: dashboardResponse.user.profile_picture,
          isPublisher: dashboardResponse.user.is_publisher,
          role: dashboardResponse.user.role,
        });

      } catch (error: any) {
        console.error('[profile] Failed to load dashboard:', error);
        // ✅ Silently fail — fallback to store data
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadDashboard();
    loadUserPosts();

    return () => {
      isMounted = false;
    };
  }, [user?.user_uid]);

  // ─── Avatar Upload ────────────────────────────────────────────────────────

  const requestImagePermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraRollStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraRollStatus !== 'granted' || cameraStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera and library permissions to change profile pictures.');
        return false;
      }
      return true;
    }
    return true;
  };

  const uploadAndSaveAvatar = async (localUri: string) => {
    setIsUploadingAvatar(true);
    try {
      let serverUrl = '';
      try {
        // ✅ Compress image
        const compressed = await compressImage(localUri, {
          width: 512,
          height: 512,
          compress: 0.8,
        });

        // ✅ Upload to Supabase (profile folder)
        serverUrl = await uploadImageToSupabaseProfile(compressed.uri);
      } catch (uploadErr) {
        console.warn('[profile] Avatar upload to Supabase failed:', uploadErr);
        throw uploadErr;
      }

      if (!serverUrl) {
        throw new Error('Failed to get upload URL.');
      }

      // ✅ PATCH /user/users/me
      await usersApi.updateMe({
        profile_picture: serverUrl,
      });

      // ✅ Update local store
      updateProfileLocal({
        avatar: serverUrl,
        profile_picture: serverUrl,
      });

      // ✅ Update dashboard data locally for instant UI update
      setDashboardData((prev) =>
        prev
          ? {
            ...prev,
            user: {
              ...prev.user,
              profile_picture: serverUrl,
            },
          }
          : prev
      );

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      console.error('[profile] Avatar upload failed:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload profile picture. Please try again.'
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAndSaveAvatar(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const handlePickLibrary = async () => {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAndSaveAvatar(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option to update your photo:',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ─── Publisher Application ────────────────────────────────────────────────

  const handleApplyForPublisher = async () => {
    // ✅ Check eligibility
    if (!canApplyForPublisher) {
      Alert.alert(
        'Requirements Not Met',
        `Please complete the following to apply:\n\n${missingRequirements
          .map((r) => `• ${r.replace(/_/g, ' ')}`)
          .join('\n')}`,
        [
          {
            text: 'Update Profile',
            onPress: () => router.push('/(onboarding)/edit-profile'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setIsApplyingPublisher(true);
    try {
      await switchToPublisher();

      // Reload dashboard to get updated publisher status
      const freshDashboard = await usersApi.dashboard({ detailed: true });
      setDashboardData(freshDashboard);

      Alert.alert('Congratulations!', 'You are now a Verified Publisher!');
      setActiveTab('posts');
    } catch (error: any) {
      Alert.alert(
        'Application Failed',
        error.message || 'Could not apply for publisher. Please try again.'
      );
    } finally {
      setIsApplyingPublisher(false);
    }
  };

  // ─── Article / Post Handlers ──────────────────────────────────────────────

  const handleCreateNewsArticle = (data: any) => {
    createArticleMutate(
      {
        title: data.headline,
        summary: data.summary || '',
        category_ids: [parseInt(data.category, 10)],
        image_url: data.imageUrl || '',
      },
      {
        onSuccess: () => {
          Alert.alert('Submitted!', 'Your news article has been submitted for review.');
        },
        onError: (err: any) => {
          Alert.alert('Error', err.message || 'Failed to publish article.');
        },
      }
    );
  };

  const handlePickPostImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPostCoverImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!postCoverImage) {
      Alert.alert('Validation Error', 'Please select a photo for your post.');
      return;
    }
    if (!postCaption.trim()) {
      Alert.alert('Validation Error', 'Please write a caption.');
      return;
    }

    setIsPublishingPost(true);
    try {
      let serverUrl = '';
      try {
        // Compress cover image to ensure consistent size and valid local Uri structure
        const compressed = await compressImage(postCoverImage, {
          width: 1024,
          height: 576,
          compress: 0.8,
        });

        // 1. Upload cover image to Supabase
        serverUrl = await uploadImageToSupabaseNews(compressed.uri, 'news');
      } catch (uploadErr: any) {
        console.warn('[profile] Supabase upload failed:', uploadErr);
        throw uploadErr;
      }

      if (!serverUrl) {
        throw new Error('Failed to obtain post image URL.');
      }

      const captionTags = (postCaption.match(/#[a-zA-Z0-9_]+/g) || []).map((t) =>
        t.replace(/^#/, '').trim()
      );

      // 2. Call backend Post creation API
      const response = await postsApi.createPost({
        content: postCaption.trim(),
        image_url: serverUrl,
        hashtags: captionTags.length > 0 ? captionTags : undefined,
      });

      // 3. Prepend newly created post
      const newPost: Post = {
        id: Date.now(),
        post_uid: response.post.post_uid,
        content: response.post.content || '',
        image_url: response.post.image_url,
        video_url: response.post.video_url,
        user_uid: user?.user_uid || '',
        user_name: user?.user_name || 'user',
        user_display_name: user?.name || 'User',
        user_profile_picture: user?.profile_picture || null,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        is_edited: false,
        edited_at: null,
        created_at: response.post.created_at,
        time_ago: 'Just now',
        hashtags: response.post.hashtags || captionTags || [],
        is_liked: false,
      };

      setPosts([newPost, ...posts]);
      setPostCaption('');
      setPostCoverImage('');
      setShowCreatePostModal(false);
      Alert.alert('Success', 'Your post has been published successfully!');
    } catch (error: any) {
      console.error('[profile] Failed to create post:', error);
      Alert.alert('Error', error.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsPublishingPost(false);
    }
  };

  const handleDeleteArticle = (uid: string) => {
    Alert.alert('Delete Article', 'Are you sure you want to delete this article?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteArticleMutate(uid);
        },
      },
    ]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.push('/(tabs)/more')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.push('/(tabs)/notifications')}
          activeOpacity={0.7}
        >
          <View>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadNotifications > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isLoadingProfile && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading profile...
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <LinearGradient
            colors={isDark ? ['#1e1e38', '#12122b'] : ['#e0ebff', '#ffffff']}
            style={styles.profileCardBg}
          >
            <View style={styles.profileInfoContainer}>
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {isUploadingAvatar ? (
                  <View style={[styles.avatarImage, styles.avatarLoadingContainer]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                  />
                )}
                <TouchableOpacity
                  style={styles.avatarEditBadge}
                  activeOpacity={0.8}
                  onPress={handleAvatarPress}
                  disabled={isUploadingAvatar}
                >
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Profile Details */}
              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={[styles.profileName, { color: colors.text }]}>
                    {displayName}
                  </Text>
                  {isPublisher && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#1E88E5"
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>

                <View style={styles.handleRow}>
                  <Text style={[styles.profileHandle, { color: colors.textSecondary }]}>
                    {userHandle}
                  </Text>
                  {isPublisher ? (
                    <View style={styles.verifiedBadgeBadge}>
                      <Ionicons
                        name="shield-checkmark"
                        size={10}
                        color="#FFFFFF"
                        style={{ marginRight: 2 }}
                      />
                      <Text style={styles.verifiedBadgeBadgeText}>Publisher</Text>
                    </View>
                  ) : (
                    <View style={[styles.userBadge, { borderColor: colors.primary }]}>
                      <Text style={[styles.userBadgeText, { color: colors.primary }]}>
                        User
                      </Text>
                    </View>
                  )}
                </View>

                {/* Location & Join Date */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {userLocation}
                    </Text>
                  </View>
                  <View style={[styles.metaItem, { marginLeft: 12 }]}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      Joined {joinedDate}
                    </Text>
                  </View>
                </View>

                {/* Followers */}
                <Text style={[styles.followersText, { color: colors.textSecondary }]}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {followersCount}
                  </Text>{' '}
                  Followers{'   '}|{'   '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {followingCount}
                  </Text>{' '}
                  Following
                </Text>
              </View>
            </View>

            {/* Profile Completion Bar */}
            {profileCompletion < 100 && (
              <View style={styles.completionContainer}>
                <View style={styles.completionHeader}>
                  <Text style={[styles.completionLabel, { color: colors.textSecondary }]}>
                    Profile Completion
                  </Text>
                  <Text style={[styles.completionPercent, { color: colors.primary }]}>
                    {profileCompletion}%
                  </Text>
                </View>
                <View style={[styles.completionBar, { backgroundColor: isDark ? '#2A2A3C' : '#E2E8F0' }]}>
                  <View
                    style={[
                      styles.completionFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${profileCompletion}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.profileActionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => router.push('/(onboarding)/edit-profile')}
              >
                <Ionicons name="pencil" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => {
                  if (isPublisher) {
                    router.push('/(tabs)/settings');
                  } else {
                    setActiveTab('publisher');
                  }
                }}
              >
                {isPublisher ? (
                  <>
                    <Ionicons
                      name="settings-outline"
                      size={14}
                      color={colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Settings</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={14}
                      color={colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Publisher</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Publisher CTA Banner */}
        {!isPublisher && dashboardData?.publisher_cta?.show_cta && (
          <View style={styles.verifyBannerWrapper}>
            <View
              style={[
                styles.verifyBanner,
                {
                  backgroundColor: isDark ? '#1C1C35' : '#F0F5FF',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.verifyBannerIconContainer}>
                <Ionicons
                  name={canApplyForPublisher ? 'shield-checkmark-outline' : 'person-circle-outline'}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.verifyBannerContent}>
                <Text style={[styles.verifyBannerTitle, { color: colors.text }]}>
                  {canApplyForPublisher ? 'Become a Publisher!' : 'Complete Your Profile'}
                </Text>
                <Text style={[styles.verifyBannerSubtitle, { color: colors.textSecondary }]}>
                  {publisherMessage}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.verifyBannerButton,
                  { backgroundColor: canApplyForPublisher ? colors.primary : colors.border },
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  canApplyForPublisher
                    ? setActiveTab('publisher')
                    : router.push('/(onboarding)/edit-profile')
                }
              >
                <Text style={styles.verifyBannerButtonText}>
                  {canApplyForPublisher ? 'Apply Now' : 'Complete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Stats</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(70, 72, 212, 0.1)' }]}>
              <Ionicons name="document-text-outline" size={20} color="#4648D4" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.posts}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="heart-outline" size={20} color="#EF4444" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.likes}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Likes</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.comments}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Comments</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="trophy-outline" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.level}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Level</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <FontAwesome5 name="coins" size={18} color="#F59E0B" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.coins}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Coins</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="star-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.points}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Points</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'posts' && styles.tabButtonActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons
              name="document-text"
              size={16}
              color={activeTab === 'posts' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'posts' ? colors.primary : colors.textSecondary }]}>
              Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'news' && styles.tabButtonActive]}
            onPress={() => setActiveTab('news')}
          >
            <Ionicons
              name="newspaper"
              size={16}
              color={activeTab === 'news' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'news' ? colors.primary : colors.textSecondary }]}>
              News
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'publisher' && styles.tabButtonActive]}
            onPress={() => {
              if (isPublisher) {
                setShowCreatePostModal(true);
              } else {
                setActiveTab('publisher');
              }
            }}
          >
            {isPublisher ? (
              <View style={styles.plusTabCircle}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </View>
            ) : (
              <>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={activeTab === 'publisher' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: activeTab === 'publisher' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Publisher
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab: Posts */}
        {activeTab === 'posts' && (
          <View style={styles.postsGrid}>
            <Text style={[styles.tabContentTitle, { color: colors.text }]}>My Posts</Text>
            {isLoadingPosts ? (
              <View style={styles.emptyTabContent}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.emptyTabContent}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={colors.textTertiary}
                  style={{ marginBottom: 12 }}
                />
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  No posts yet. Create your first post!
                </Text>
              </View>
            ) : (
              <View style={styles.postsWrapper}>
                {posts.map((post) => (
                  <TouchableOpacity
                    key={post.post_uid || post.id}
                    style={styles.postCard}
                    activeOpacity={0.9}
                    onPress={() => setSelectedPost(post)}
                  >
                    <ExpoImage
                      source={{ uri: post.image_url || 'https://placehold.co/200x200/E2E8F0/E2E8F0?text=Post' }}
                      style={styles.postImage}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="disk"
                    />
                    <TouchableOpacity
                      style={styles.postDeleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteUserPost(post.post_uid);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={[styles.postBadge, { backgroundColor: 'rgba(76, 175, 80, 0.9)' }]}>
                      <Text style={styles.postBadgeText}>Published</Text>
                    </View>
                    <View style={styles.postOverlay}>
                      <View style={styles.overlayStat}>
                        <Ionicons name="heart" size={12} color="#FFFFFF" />
                        <Text style={styles.overlayStatText}>{post.like_count ?? 0}</Text>
                      </View>
                      <View style={[styles.overlayStat, { marginLeft: 8 }]}>
                        <Ionicons name="chatbubble" size={10} color="#FFFFFF" />
                        <Text style={styles.overlayStatText}>{post.comment_count ?? 0}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab: News */}
        {activeTab === 'news' && (
          <View style={styles.newsSection}>
            <Text style={[styles.tabContentTitle, { color: colors.text }]}>News Overview</Text>
            {!isPublisher ? (
              <View
                style={[
                  styles.unverifiedNewsPrompt,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="shield-outline"
                  size={32}
                  color={colors.textSecondary}
                  style={{ marginBottom: 8 }}
                />
                <Text style={[styles.promptTitle, { color: colors.text }]}>
                  Publisher Verification Required
                </Text>
                <Text style={[styles.promptSubtitle, { color: colors.textSecondary }]}>
                  You need to be verified as a publisher to view news insights and manage news articles.
                </Text>
                <TouchableOpacity
                  style={[styles.promptButton, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('publisher')}
                >
                  <Text style={styles.promptButtonText}>View Publisher Status</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyTabContent}>
                <Ionicons
                  name="newspaper-outline"
                  size={48}
                  color={colors.textTertiary}
                  style={{ marginBottom: 12 }}
                />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
                  Your published articles will appear here.
                </Text>
                <TouchableOpacity
                  style={[styles.promptButton, { backgroundColor: colors.primary, paddingHorizontal: 24 }]}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(publisher)/dashboard')}
                >
                  <Text style={styles.promptButtonText}>Open Publisher Dashboard</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Tab: Saved */}
        {activeTab === 'saved' && (
          <View style={styles.postsGrid}>
            <Text style={[styles.tabContentTitle, { color: colors.text }]}>Saved Items</Text>
            {allBookmarks.length === 0 ? (
              <View style={styles.emptyTabContent}>
                <Ionicons
                  name="bookmark-outline"
                  size={48}
                  color={colors.textTertiary}
                  style={{ marginBottom: 12 }}
                />
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  No saved items found. Start bookmarking news and posts!
                </Text>
              </View>
            ) : (
              <View style={styles.postsWrapper}>
                {allBookmarks.map((bookmark) => {
                  // ✅ Handle both news and post content types
                  const isNews = bookmark.content_type === 'news';
                  const content = isNews ? bookmark.news : bookmark.post;

                  if (!content) return null;

                  const imageUrl = isNews
                    ? content.image_url
                    : content.images?.[0]?.image_url;

                  const likesCount = isNews
                    ? content.likes || 0
                    : content.like_count || 0;

                  const commentsCount = isNews
                    ? content.comments || 0
                    : content.comment_count || 0;

                  return (
                    <TouchableOpacity
                      key={`${bookmark.content_type}-${bookmark.content_uid}`}
                      style={styles.postCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (isNews) {
                          router.push(`/news/${bookmark.content_uid}`);
                        } else {
                          // Navigate to post detail or open modal
                          //router.push(`/posts/${bookmark.content_uid}`);
                        }
                      }}
                    >
                      <Image
                        source={{
                          uri: imageUrl || 'https://placehold.co/200x200/E2E8F0/E2E8F0?text=Saved'
                        }}
                        style={styles.postImage}
                      />

                      {/* Content Type Badge */}
                      <View style={[
                        styles.postBadge,
                        {
                          backgroundColor: isNews
                            ? 'rgba(70, 72, 212, 0.9)'
                            : 'rgba(255, 159, 10, 0.9)'
                        }
                      ]}>
                        <Ionicons
                          name={isNews ? 'newspaper' : 'chatbubble'}
                          size={10}
                          color="#FFFFFF"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.postBadgeText}>
                          {isNews ? 'News' : 'Post'}
                        </Text>
                      </View>

                      <View style={styles.postOverlay}>
                        <View style={styles.overlayStat}>
                          <Ionicons name="heart" size={12} color="#FFFFFF" />
                          <Text style={styles.overlayStatText}>{likesCount}</Text>
                        </View>
                        <View style={[styles.overlayStat, { marginLeft: 8 }]}>
                          <Ionicons name="chatbubble" size={10} color="#FFFFFF" />
                          <Text style={styles.overlayStatText}>{commentsCount}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Tab: Publisher */}
        {activeTab === 'publisher' && (
          <View style={styles.publisherSection}>
            <Text style={[styles.tabContentTitle, { color: colors.text }]}>
              Publisher Status
            </Text>

            {isPublisher ? (
              <View
                style={[
                  styles.publisherCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', padding: 24 },
                ]}
              >
                <Ionicons name="shield-checkmark" size={64} color="#10B981" style={{ marginBottom: 16 }} />
                <Text style={[styles.publisherTitle, { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }]}>
                  Verified Publisher
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                  You have access to the publisher dashboard where you can create articles, polls, and manage insights.
                </Text>
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.primary, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 48, borderRadius: 24 }]}
                  onPress={() => router.push('/(publisher)/dashboard')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="speedometer-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.applyButtonText}>Go to Publisher Dashboard</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Eligibility Status Card */
              <View
                style={[
                  styles.publisherCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.publisherHeader}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={32}
                    color={canApplyForPublisher ? colors.primary : colors.textSecondary}
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={[styles.publisherTitle, { color: colors.text }]}>
                    {canApplyForPublisher
                      ? 'You are Ready to Apply!'
                      : 'Complete Requirements to Apply'}
                  </Text>
                  <Text style={[styles.publisherSubtitle, { color: colors.textSecondary }]}>
                    {publisherMessage}
                  </Text>
                </View>

                {/* Requirements List */}
                {missingRequirements.length > 0 && (
                  <View style={styles.requirementsList}>
                    <Text style={[styles.requirementsTitle, { color: colors.text }]}>
                      Missing Requirements:
                    </Text>
                    {missingRequirements.map((req) => (
                      <View key={req} style={styles.requirementItem}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                        <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                          {req
                            .replace(/_/g, ' ')
                            .split(' ')
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                        </Text>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[styles.completeButton, { backgroundColor: colors.primary }]}
                      onPress={() => router.push('/(onboarding)/edit-profile')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="pencil" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.completeButtonText}>Complete Profile</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* All Requirements Met */}
                {missingRequirements.length === 0 && canApplyForPublisher && (
                  <View style={styles.readySection}>
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                    </View>
                    <Text style={[styles.readyText, { color: colors.text }]}>
                      All requirements completed!
                    </Text>
                    <Text style={[styles.readySubtext, { color: colors.textSecondary }]}>
                      You're now eligible to become a verified publisher and start publishing news
                      articles for your community.
                    </Text>

                    <TouchableOpacity
                      style={[styles.applyButton, { backgroundColor: colors.primary }]}
                      onPress={handleApplyForPublisher}
                      disabled={isApplyingPublisher}
                      activeOpacity={0.8}
                    >
                      {isApplyingPublisher ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="shield-checkmark"
                            size={18}
                            color="#FFFFFF"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.applyButtonText}>Apply as Publisher</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Info Box */}
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: isDark ? 'rgba(70, 72, 212, 0.1)' : 'rgba(70, 72, 212, 0.05)',
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Publishers can write and publish news articles, earn badges, and gain followers in
                    their local community.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        {showFabMenu && (
          <View
            style={[
              styles.fabMenu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.fabMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowFabMenu(false);
                setShowCreatePostModal(true);
              }}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={colors.text}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.fabMenuText, { color: colors.text }]}>Create Post</Text>
            </TouchableOpacity>

            <View style={[styles.fabDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.fabMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowFabMenu(false);
                if (isPublisher) {
                  setShowCreateArticleModal(true);
                } else {
                  Alert.alert(
                    'Access Denied',
                    'Write News is only available for verified publishers.',
                    [
                      { text: 'View Status', onPress: () => setActiveTab('publisher') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }
              }}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={colors.text}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.fabMenuText, { color: colors.text }]}>Write News</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={() => setShowFabMenu(!showFabMenu)}
        >
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <CreateArticleModal
        isVisible={showCreateArticleModal}
        onClose={() => setShowCreateArticleModal(false)}
        onSubmit={handleCreateNewsArticle}
      />

      {/* Create Post Modal */}
      <Modal
        visible={showCreatePostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreatePostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setShowCreatePostModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Post</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Caption</Text>
                <TextInput
                  style={[
                    styles.modalTextInput,
                    styles.modalTextArea,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Share a story or what's on your mind..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  value={postCaption}
                  onChangeText={setPostCaption}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Cover Image</Text>
                {postCoverImage ? (
                  <View style={styles.postCoverContainer}>
                    <Image source={{ uri: postCoverImage }} style={styles.postCoverImg} />
                    <TouchableOpacity
                      style={styles.postCoverRemoveBtn}
                      onPress={() => setPostCoverImage('')}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.textInput,
                      { alignItems: 'center', justifyContent: 'center', height: 100 },
                    ]}
                    onPress={handlePickPostImage}
                  >
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={colors.textSecondary}
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Pick from Gallery
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.publishPostBtn,
                  { backgroundColor: colors.primary },
                  isPublishingPost && { opacity: 0.7 }
                ]}
                activeOpacity={0.8}
                onPress={handleCreatePost}
                disabled={isPublishingPost}
              >
                {isPublishingPost ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.publishPostBtnText}>Publish Post</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Post Detail Modal */}
      <Modal
        visible={selectedPost !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, height: '85%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSelectedPost(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Post Details</Text>
              <TouchableOpacity
                onPress={() => selectedPost && handleDeleteUserPost(selectedPost.post_uid)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.postDetailContainer}
              >
                {/* Author Info */}
                <View style={styles.postDetailAuthorRow}>
                  <Image
                    source={{
                      uri: selectedPost.user_profile_picture || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=U',
                    }}
                    style={styles.postDetailAvatar}
                  />
                  <View style={styles.postDetailAuthorInfo}>
                    <Text style={[styles.postDetailDisplayName, { color: colors.text }]}>
                      {selectedPost.user_display_name}
                    </Text>
                    <Text style={[styles.postDetailUsername, { color: colors.textSecondary }]}>
                      @{selectedPost.user_name} • {selectedPost.time_ago}
                    </Text>
                  </View>
                </View>

                {/* Caption / Content */}
                <Text style={[styles.postDetailContent, { color: colors.text }]}>
                  {selectedPost.content}
                </Text>

                {/* Image */}
                {selectedPost.image_url && (
                  <Image
                    source={{ uri: selectedPost.image_url }}
                    style={styles.postDetailImage}
                    resizeMode="cover"
                  />
                )}

                {/* Hashtags */}
                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                  <View style={styles.postDetailHashtagsRow}>
                    {selectedPost.hashtags.map((tag, index) => (
                      <Text key={index} style={[styles.hashtagText, { color: colors.primary }]}>
                        #{tag}{' '}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Stats / Interactions */}
                <View style={[styles.postDetailStatsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.postDetailStatItem}
                    onPress={() => handleLikePost(selectedPost.post_uid)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={selectedPost.is_liked ? "heart" : "heart-outline"}
                      size={20}
                      color={selectedPost.is_liked ? "#EF4444" : colors.textSecondary}
                    />
                    <Text style={[styles.postDetailStatValue, { color: selectedPost.is_liked ? "#EF4444" : colors.textSecondary }]}>
                      {selectedPost.like_count ?? 0} Likes
                    </Text>
                  </TouchableOpacity>

                  <View style={[styles.postDetailStatItem, { marginLeft: 24 }]}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.postDetailStatValue, { color: colors.textSecondary }]}>
                      {selectedPost.comment_count ?? 0} Comments
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.postDetailStatItem, { marginLeft: 24 }]}
                    onPress={() => handleSharePost(selectedPost.post_uid)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.postDetailStatValue, { color: colors.textSecondary }]}>
                      {selectedPost.share_count ?? 0} Shares
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Comments Header */}
                <Text style={[styles.commentsSectionTitle, { color: colors.text }]}>Comments</Text>

                {/* Comments List */}
                {isLoadingComments ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                ) : !Array.isArray(comments) || comments.length === 0 ? (
                  <Text style={[styles.noCommentsText, { color: colors.textTertiary }]}>No comments yet. Be the first to comment!</Text>
                ) : (
                  <View style={styles.commentsList}>
                    {comments.map((comment) => (
                      <View key={comment.id} style={[styles.commentCard, { borderBottomColor: colors.border }]}>
                        <Image
                          source={{ uri: comment.user_avatar || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=U' }}
                          style={styles.commentAvatar}
                        />
                        <View style={comment.id.toString().startsWith('temp_') ? { marginLeft: 10, flex: 1, opacity: 0.7 } : { marginLeft: 10, flex: 1 }}>
                          <View style={styles.commentHeaderRow}>
                            <Text style={[styles.commentAuthorName, { color: colors.text }]}>{comment.user_name}</Text>
                            <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                              {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}
                            </Text>
                          </View>
                          <Text style={[styles.commentText, { color: colors.text }]}>{comment.comment_text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            {/* Comment Input Sticky Bar */}
            {selectedPost && (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
              >
                <View style={[styles.commentInputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    style={[styles.commentInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="Write a comment..."
                    placeholderTextColor={colors.textTertiary}
                    value={newCommentText}
                    onChangeText={setNewCommentText}
                  />
                  <TouchableOpacity
                    style={[styles.commentSendBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddComment}
                    disabled={!newCommentText.trim()}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: 'Poppins_700Bold',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  profileSection: {
    width: '100%',
  },
  profileCardBg: {
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarLoadingContainer: {
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  profileHandle: {
    fontSize: 13,
    fontWeight: '500',
  },
  userBadge: {
    marginLeft: 8,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  userBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadgeBadge: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E88E5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedBadgeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    marginLeft: 4,
  },
  followersText: {
    fontSize: 12,
    marginTop: 8,
  },
  completionContainer: {
    marginTop: 16,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  completionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  completionPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  completionBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    borderRadius: 3,
  },
  profileActionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  verifyBannerWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifyBannerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  verifyBannerContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  verifyBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  verifyBannerSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  verifyBannerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  verifyBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: (screenWidth - 44) / 2,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  tabsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginTop: 32,
    height: 48,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    borderBottomColor: '#4648D4',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  plusTabCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4648D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContentTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  postsGrid: {
    width: '100%',
  },
  postsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  postCard: {
    width: (screenWidth - 44) / 2,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  postBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  postDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayStatText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  newsSection: {
    width: '100%',
  },
  unverifiedNewsPrompt: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginTop: 8,
    textAlign: 'center',
  },
  promptSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  promptButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  promptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyTabContent: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  publisherSection: {
    width: '100%',
  },
  publisherCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  publisherHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  publisherTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  publisherSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
  requirementsList: {
    gap: 12,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  readySection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkmarkContainer: {
    marginBottom: 12,
  },
  readyText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  readySubtext: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    alignItems: 'flex-end',
    gap: 8,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabMenu: {
    borderRadius: 12,
    borderWidth: 1,
    width: 140,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  fabMenuText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fabDivider: {
    height: 1,
  },
  formGroup: {
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: screenHeight * 0.85,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  modalFormContent: {
    padding: 20,
    gap: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalTextInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  textInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  postCoverContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  postCoverImg: {
    width: '100%',
    height: '100%',
  },
  postCoverRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishPostBtn: {
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  publishPostBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  postDetailContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  postDetailAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  postDetailAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  postDetailAuthorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  postDetailDisplayName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  postDetailUsername: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
  },
  postDetailContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'Poppins_400Regular',
  },
  postDetailImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginBottom: 16,
  },
  postDetailHashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  hashtagText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  postDetailStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  postDetailStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postDetailStatValue: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  commentsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
  },
  noCommentsText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
    fontFamily: 'Poppins_400Regular',
  },
  commentsList: {
    gap: 12,
  },
  commentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentBody: {
    marginLeft: 10,
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  commentTime: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  commentText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
    lineHeight: 18,
  },
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  createHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 4,
  },
});