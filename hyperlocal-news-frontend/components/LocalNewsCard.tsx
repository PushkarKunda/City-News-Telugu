import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useAppTextScale } from '@/hooks/useAppTextScale';
import { resolveArticleImageUrl, getCategoryFallbackImage } from '@/utils/imageResolver';

export interface LocalNewsItem {
  id: string;
  title: string;
  distance: string;
  timeAgo: string;
  views: string;
  imageUrl: string;
  variant: 'vertical' | 'horizontal';
}

interface LocalNewsCardProps {
  item: LocalNewsItem;
  onPress?: () => void;
}

function LocalNewsCardComponent({ item, onPress }: LocalNewsCardProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scale = useAppTextScale();
  const scaledFontSize = (size: number) => ({ fontSize: size * scale });

  const resolvedImg = useMemo(() => {
    return resolveArticleImageUrl({
      imageUrl: item.imageUrl,
      title: item.title,
      categoryName: 'Local',
    });
  }, [item.imageUrl, item.title]);

  const [imgSrc, setImgSrc] = useState(resolvedImg);
  useEffect(() => {
    setImgSrc(resolvedImg);
  }, [resolvedImg]);

  if (item.variant === 'horizontal') {
    return (
      <TouchableOpacity 
        style={[styles.horizontalCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.horizontalContent}>
          <View style={[styles.distanceBadgeLight, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="near-me" size={10} color={colors.primary} />
            <Text style={[styles.distanceTextLight, { color: colors.primary }, scaledFontSize(10)]}>{item.distance}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }, scaledFontSize(16)]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoText, { color: colors.textSecondary }, scaledFontSize(12)]}>{item.timeAgo}</Text>
            <View style={styles.dot} />
            <MaterialIcons name="visibility" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary }, scaledFontSize(12)]}>{item.views}</Text>
          </View>
        </View>
        <Image
          source={{ uri: imgSrc }}
          style={styles.horizontalImage}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          onError={() => {
            const fb = getCategoryFallbackImage('Local');
            if (imgSrc !== fb) setImgSrc(fb);
          }}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.verticalCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.verticalImageContainer}>
        <Image
          source={{ uri: imgSrc }}
          style={styles.verticalImage}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          onError={() => {
            const fb = getCategoryFallbackImage('Local');
            if (imgSrc !== fb) setImgSrc(fb);
          }}
        />
        <View style={[styles.distanceBadgeSolid, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="near-me" size={10} color="#FFF" />
          <Text style={[styles.distanceTextSolid, scaledFontSize(10)]}>{item.distance}</Text>
        </View>
      </View>
      <View style={styles.verticalContent}>
        <Text style={[styles.title, { color: colors.text }, scaledFontSize(18)]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.infoRow}>
          <MaterialIcons name="schedule" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.infoText, { color: colors.textSecondary }, scaledFontSize(12)]}>{item.timeAgo}</Text>
          <View style={styles.dot} />
          <MaterialIcons name="visibility" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.infoText, { color: colors.textSecondary }, scaledFontSize(12)]}>{item.views}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const LocalNewsCard = React.memo(
  LocalNewsCardComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.distance === nextProps.item.distance &&
      prevProps.item.timeAgo === nextProps.item.timeAgo &&
      prevProps.item.views === nextProps.item.views &&
      prevProps.item.imageUrl === nextProps.item.imageUrl &&
      prevProps.item.variant === nextProps.item.variant
    );
  }
);

const styles = StyleSheet.create({
  horizontalCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 16,
  },
  horizontalContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
  },
  horizontalImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
  },
  verticalCard: {
    flexDirection: 'column',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  verticalImageContainer: {
    height: 192,
    width: '100%',
    position: 'relative',
  },
  verticalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  verticalContent: {
    padding: 16,
    paddingTop: 15,
    gap: 8,
  },
  title: {
    fontWeight: '700',
    lineHeight: 22.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    fontWeight: '400',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
  },
  distanceBadgeSolid: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  distanceTextSolid: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  distanceBadgeLight: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  distanceTextLight: {
    fontSize: 10,
    fontWeight: '700',
  },
});
